-- TICKET MADA — INSTALLATION SQL CONSOLIDÉE
-- Source: les 17 migrations de supabase/migrations/, dans leur ordre chronologique.
-- IMPORTANT: à exécuter UNE SEULE FOIS sur un projet Supabase NEUF.
-- Ne pas exécuter si une migration Ticket Mada a déjà été appliquée.
-- Les migrations individuelles restent la source de référence du dépôt.
-- Correction intégrée: signature de save_organizer_event_draft dans GRANT/REVOKE
-- alignée sur ses 11 paramètres déclarés dans la migration 005.
-- Ce script ne configure PAS de fournisseur de paiement ni de webhook.
-- Il ne crée PAS le secret TICKET_QR_HMAC_SECRET de la fonction Edge.


-- ============================================================================
-- MIGRATION: 202611080001_initial_ticketing_schema.sql
-- ============================================================================

-- Ticket Mada: première structure de données. Aucun flux de paiement n'est activé.
create extension if not exists pgcrypto;

create type public.account_role as enum ('customer', 'organizer', 'admin');
create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.order_status as enum ('pending', 'paid', 'cancelled', 'refunded');
create type public.ticket_status as enum ('valid', 'used', 'cancelled', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.account_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '',
  category text not null default 'Autre',
  city text not null,
  venue text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  cover_path text,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price_mga bigint not null check (price_mga >= 0),
  quantity_total integer not null check (quantity_total >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0 and quantity_sold <= quantity_total),
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  status public.order_status not null default 'pending',
  currency char(3) not null default 'MGA' check (currency = 'MGA'),
  subtotal_mga bigint not null check (subtotal_mga >= 0),
  payment_provider text,
  provider_reference text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  holder_name text not null,
  qr_token_hash text not null unique,
  status public.ticket_status not null default 'valid',
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create index events_public_listing_idx on public.events (status, starts_at, city);
create index events_organizer_idx on public.events (organizer_id, created_at desc);
create index ticket_types_event_idx on public.ticket_types (event_id);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index tickets_order_idx on public.tickets (order_id);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;

create policy "Profiles are readable by authenticated users" on public.profiles
  for select to authenticated using (true);
create policy "Users can create their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Published events are public" on public.events
  for select to anon, authenticated using (status = 'published' or organizer_id = auth.uid());
create policy "Organizers can create events" on public.events
  for insert to authenticated with check (organizer_id = auth.uid());
create policy "Organizers can update their events" on public.events
  for update to authenticated using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());

create policy "Ticket types for visible events are public" on public.ticket_types
  for select to anon, authenticated using (
    exists (select 1 from public.events e where e.id = event_id and (e.status = 'published' or e.organizer_id = auth.uid()))
  );
create policy "Organizers manage ticket types for their events" on public.ticket_types
  for all to authenticated using (
    exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
  );

create policy "Buyers can read their orders" on public.orders
  for select to authenticated using (buyer_id = auth.uid());
create policy "Buyers can read their tickets" on public.tickets
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
  );

-- Les écritures sensibles (paiement, émission, annulation et scan) devront passer
-- par des fonctions serveur transactionnelles avec vérification d'authentification.
-- Ne jamais autoriser le client mobile à modifier directement le statut paid/used.


-- ============================================================================
-- MIGRATION: 202611080002_commission_tracking.sql
-- ============================================================================

-- Ticket Mada: commission tracking foundation only.
-- This migration does NOT connect a payment provider or move money.
create table public.organizer_commission_terms (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  commission_bps integer not null check (commission_bps between 0 and 10000),
  currency char(3) not null default 'MGA' check (currency = 'MGA'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organizer_id, created_at)
);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  provider text not null,
  provider_transaction_id text unique,
  status text not null check (status in ('created', 'pending', 'succeeded', 'failed', 'refunded')),
  gross_amount_mga bigint not null check (gross_amount_mga >= 0),
  provider_fee_mga bigint not null default 0 check (provider_fee_mga >= 0),
  platform_commission_mga bigint not null default 0 check (platform_commission_mga >= 0),
  organizer_net_mga bigint not null default 0 check (organizer_net_mga >= 0),
  idempotency_key text not null unique,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (provider_fee_mga + platform_commission_mga + organizer_net_mga <= gross_amount_mga)
);

alter table public.organizer_commission_terms enable row level security;
alter table public.payment_records enable row level security;

-- No client-side write policies: only trusted server-side code may create/update
-- payment records after verifying signed provider callbacks and idempotency.
create policy "Organizers can view their own commission terms"
  on public.organizer_commission_terms for select to authenticated
  using (organizer_id = auth.uid());

create policy "Buyers can view payment status for their own orders"
  on public.payment_records for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.buyer_id = auth.uid()
  ));

-- Important: provider fees and platform commissions are separate ledger amounts.
-- Do not issue tickets based on a client redirect; require server verification.


-- ============================================================================
-- MIGRATION: 202611080003_protect_organizer_roles.sql
-- ============================================================================

-- Protect account roles: users must never promote themselves to organizer/admin.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'service_role') then
    if tg_op = 'INSERT' then
      new.role := 'customer';
    elsif new.role is distinct from old.role then
      raise exception 'Account role changes require server-side approval';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before insert or update of role on public.profiles
for each row execute function public.protect_profile_role();

-- Event creation and editing require an organizer role granted by trusted server logic.
drop policy if exists "Organizers can create events" on public.events;
create policy "Approved organizers can create events" on public.events
  for insert to authenticated
  with check (
    organizer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
  );

drop policy if exists "Organizers can update their events" on public.events;
create policy "Approved organizers can update their events" on public.events
  for update to authenticated
  using (
    organizer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
  )
  with check (
    organizer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
  );

drop policy if exists "Organizers manage ticket types for their events" on public.ticket_types;
create policy "Approved organizers manage ticket types for their events" on public.ticket_types
  for all to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.profiles p on p.id = e.organizer_id
      where e.id = event_id and e.organizer_id = auth.uid() and p.role = 'organizer'
    )
  )
  with check (
    exists (
      select 1 from public.events e
      join public.profiles p on p.id = e.organizer_id
      where e.id = event_id and e.organizer_id = auth.uid() and p.role = 'organizer'
    )
  );


-- ============================================================================
-- MIGRATION: 202611090001_auth_profiles_and_organizer_applications.sql
-- ============================================================================

-- Create a profile automatically for every newly registered account.
-- New accounts always start as customers; organizer access is requested separately.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.organizer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_name text not null check (char_length(organization_name) between 2 and 120),
  activity_type text not null check (char_length(activity_type) between 2 and 80),
  city text not null check (char_length(city) between 2 and 100),
  contact_phone text not null check (char_length(contact_phone) between 6 and 30),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists organizer_applications_user_created_idx
  on public.organizer_applications (user_id, created_at desc);

create unique index if not exists one_pending_organizer_application_per_user
  on public.organizer_applications (user_id) where status = 'pending';

alter table public.organizer_applications enable row level security;

drop policy if exists "Users can submit organizer applications" on public.organizer_applications;
create policy "Users can submit organizer applications"
  on public.organizer_applications
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'customer'
    )
  );

drop policy if exists "Users can read their organizer applications" on public.organizer_applications;
create policy "Users can read their organizer applications"
  on public.organizer_applications
  for select to authenticated
  using (user_id = auth.uid());

-- No client-side UPDATE policy is intentionally created. Approval and role
-- promotion must be performed by trusted server-side administration only.


-- ============================================================================
-- MIGRATION: 202611090002_admin_organizer_review.sql
-- ============================================================================

-- Admin review workflow for organizer access.
-- The application role is checked in the database; the client cannot approve itself.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'service_role') then
    if tg_op = 'INSERT' then
      new.role := 'customer';
    elsif new.role is distinct from old.role then
      raise exception 'Account role changes require server-side approval';
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists "Admins can review organizer applications" on public.organizer_applications;
create policy "Admins can review organizer applications"
  on public.organizer_applications
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.review_organizer_application(
  p_application_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Administrator access required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision';
  end if;

  select user_id into v_user_id
  from public.organizer_applications
  where id = p_application_id and status = 'pending'
  for update;

  if v_user_id is null then
    raise exception 'Pending application not found';
  end if;

  update public.organizer_applications
  set status = p_decision, reviewed_at = now()
  where id = p_application_id;

  if p_decision = 'approved' then
    update public.profiles
    set role = 'organizer', updated_at = now()
    where id = v_user_id and role = 'customer';

    if not found then
      raise exception 'Applicant profile is missing or has an unexpected role';
    end if;
  end if;
end;
$$;

revoke all on function public.review_organizer_application(uuid, text) from public;
grant execute on function public.review_organizer_application(uuid, text) to authenticated;


-- ============================================================================
-- MIGRATION: 202611090003_secure_organizer_review.sql
-- ============================================================================

-- Secure administrator review for organizer applications.
-- The caller must already have an administrator role assigned by a trusted operator.

drop policy if exists "Admins can read organizer applications" on public.organizer_applications;
create policy "Admins can read organizer applications"
  on public.organizer_applications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create or replace function public.review_organizer_application(
  p_application_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'Administrator access required';
  end if;

  select a.user_id, a.status
    into v_user_id, v_status
  from public.organizer_applications a
  where a.id = p_application_id
  for update;

  if not found then
    raise exception 'Organizer application not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'This application has already been reviewed';
  end if;

  if p_decision = 'approved' then
    update public.profiles
    set role = 'organizer'
    where id = v_user_id
      and role = 'customer';

    if not found then
      raise exception 'Applicant profile is missing or no longer eligible';
    end if;
  end if;

  update public.organizer_applications
  set status = p_decision,
      reviewed_at = now()
  where id = p_application_id;
end;
$$;

revoke all on function public.review_organizer_application(uuid, text) from public;
revoke all on function public.review_organizer_application(uuid, text) from anon;
grant execute on function public.review_organizer_application(uuid, text) to authenticated;

comment on function public.review_organizer_application(uuid, text)
  is 'Allows authenticated administrators to approve or reject a pending organizer application atomically.';


-- ============================================================================
-- MIGRATION: 202611090004_organizer_draft_delete_policy.sql
-- ============================================================================

-- Allow organizers to remove only their own unpublished draft events.
-- This is also used to roll back an incomplete draft sync if ticket tiers fail.
drop policy if exists "Organizers can delete their own draft events" on public.events;
create policy "Organizers can delete their own draft events"
  on public.events
  for delete to authenticated
  using (
    organizer_id = auth.uid()
    and status = 'draft'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'organizer'
    )
  );


-- ============================================================================
-- MIGRATION: 202611090005_atomic_organizer_draft_sync.sql
-- ============================================================================

-- Atomic create/update of an organizer's private event draft and ticket tiers.
alter table public.events add column if not exists address text not null default '';
create or replace function public.save_organizer_event_draft(
  p_event_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_city text,
  p_venue text,
  p_address text,
  p_cover_path text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_ticket_tiers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
  v_tier jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_cover_path is not null and p_cover_path !~ ('^' || v_user_id::text || '/') then
    raise exception 'Poster path must belong to the authenticated organizer';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and role = 'organizer'
  ) then
    raise exception 'Approved organizer access required';
  end if;

  if char_length(trim(coalesce(p_title, ''))) < 4
     or char_length(trim(coalesce(p_title, ''))) > 140
     or char_length(trim(coalesce(p_city, ''))) = 0
     or char_length(trim(coalesce(p_venue, ''))) = 0
     or p_starts_at is null
     or (p_ends_at is not null and p_ends_at <= p_starts_at)
     then
    raise exception 'Invalid event draft data';
  end if;

  if coalesce(jsonb_typeof(p_ticket_tiers), 'null') <> 'array' then
    raise exception 'Ticket tiers must be a JSON array';
  end if;
  if jsonb_array_length(p_ticket_tiers) = 0 then
    raise exception 'At least one ticket tier is required';
  end if;

  for v_tier in select item from jsonb_array_elements(p_ticket_tiers) as x(item)
  loop
    if char_length(trim(coalesce(v_tier->>'name', ''))) = 0
       or coalesce((v_tier->>'price_mga')::bigint, -1) < 0
       or coalesce((v_tier->>'quantity_total')::integer, -1) < 1 then
      raise exception 'Invalid ticket tier';
    end if;
  end loop;

  if p_event_id is null then
    insert into public.events (
      organizer_id, title, description, category, city, venue, address, cover_path, starts_at, ends_at, status
    ) values (
      v_user_id, trim(p_title), coalesce(p_description, ''), coalesce(p_category, 'Autre'),
      trim(p_city), trim(p_venue), trim(coalesce(p_address, '')), nullif(trim(coalesce(p_cover_path, '')), ''), p_starts_at, p_ends_at, 'draft'
    ) returning id into v_event_id;
  else
    update public.events
    set title = trim(p_title),
        description = coalesce(p_description, ''),
        category = coalesce(p_category, 'Autre'),
        city = trim(p_city),
        venue = trim(p_venue),
        address = trim(coalesce(p_address, '')),
        cover_path = coalesce(nullif(trim(coalesce(p_cover_path, '')), ''), cover_path),
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        updated_at = now()
    where id = p_event_id
      and organizer_id = v_user_id
      and status = 'draft'
    returning id into v_event_id;

    if v_event_id is null then
      raise exception 'Draft not found or cannot be edited';
    end if;

    delete from public.ticket_types where event_id = v_event_id;
  end if;

  insert into public.ticket_types (event_id, name, price_mga, quantity_total)
  select
    v_event_id,
    trim(tier->>'name'),
    (tier->>'price_mga')::bigint,
    (tier->>'quantity_total')::integer
  from jsonb_array_elements(p_ticket_tiers) as x(tier);

  return v_event_id;
end;
$$;

revoke all on function public.save_organizer_event_draft(uuid, text, text, text, text, text, text, text, timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.save_organizer_event_draft(uuid, text, text, text, text, text, text, text, timestamptz, timestamptz, jsonb) to authenticated;


-- ============================================================================
-- MIGRATION: 202611090006_private_event_posters.sql
-- ============================================================================

-- Private poster storage. Each organizer can access only objects under their own UUID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-posters',
  'event-posters',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Organizers upload their own event posters"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
);

create policy "Organizers read their own event posters"
on storage.objects for select to authenticated
using (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
);

create policy "Organizers update their own event posters"
on storage.objects for update to authenticated
using (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
)
with check (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
);

create policy "Organizers delete their own event posters"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
);

-- Spectators may read an image only when its exact object path is attached to a published event.
create policy "Public can read posters for published events"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'event-posters'
  and exists (
    select 1
    from public.events e
    where e.cover_path = storage.objects.name
      and e.status = 'published'
  )
);


-- ============================================================================
-- MIGRATION: 202611090007_secure_event_publication.sql
-- ============================================================================

-- Only the trusted publication RPC may change an event's public visibility.
create or replace function public.guard_event_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'Events must be created as drafts';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    raise exception 'Event publication changes require the trusted publication function';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_event_status on public.events;
create trigger guard_event_status
before insert or update of status on public.events
for each row execute function public.guard_event_status();

create or replace function public.set_organizer_event_publication(
  p_event_id uuid,
  p_publish boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_publish is null then
    raise exception 'Publication decision is required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and role = 'organizer'
  ) then
    raise exception 'Approved organizer access required';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id and organizer_id = v_user_id
  for update;

  if not found then
    raise exception 'Event not found or not owned by this organizer';
  end if;

  if p_publish then
    if v_event.status <> 'draft' then
      raise exception 'Only draft events can be published';
    end if;

    if v_event.starts_at <= now()
       or char_length(trim(v_event.title)) < 4
       or char_length(trim(v_event.description)) < 30
       or char_length(trim(v_event.city)) = 0
       or char_length(trim(v_event.venue)) = 0
       or char_length(trim(coalesce(v_event.address, ''))) = 0 then
      raise exception 'Complete the event details and choose a future date before publishing';
    end if;

    if not exists (
      select 1 from public.ticket_types t
      where t.event_id = v_event.id
        and t.quantity_total > t.quantity_sold
        and t.price_mga >= 0
        and char_length(trim(t.name)) > 0
    ) then
      raise exception 'At least one valid ticket category is required';
    end if;

    update public.events
    set status = 'published', updated_at = now()
    where id = v_event.id;
  else
    if v_event.status <> 'published' then
      raise exception 'Only published events can be unpublished';
    end if;

    if exists (
      select 1 from public.orders o
      where o.event_id = v_event.id
        and o.status in ('pending', 'paid')
    ) then
      raise exception 'This event has pending or paid orders; use the cancellation and refund process instead';
    end if;

    update public.events
    set status = 'draft', updated_at = now()
    where id = v_event.id;
  end if;
end;
$$;

revoke all on function public.set_organizer_event_publication(uuid, boolean) from public, anon;
grant execute on function public.set_organizer_event_publication(uuid, boolean) to authenticated;


-- ============================================================================
-- MIGRATION: 202611090008_atomic_ticket_reservations.sql
-- ============================================================================

-- Atomic ticket reservations. This does not collect or confirm payments.
alter table public.ticket_types
  add column if not exists quantity_reserved integer not null default 0
  check (quantity_reserved >= 0 and quantity_reserved + quantity_sold <= quantity_total);

alter table public.orders
  add column if not exists expires_at timestamptz,
  add column if not exists reservation_key text;

create unique index if not exists orders_buyer_reservation_key_uidx
  on public.orders (buyer_id, reservation_key)
  where reservation_key is not null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 10),
  unit_price_mga bigint not null check (unit_price_mga >= 0),
  line_total_mga bigint generated always as (quantity::bigint * unit_price_mga) stored,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists orders_pending_expiry_idx on public.orders(status, expires_at)
  where status = 'pending';

alter table public.order_items enable row level security;

drop policy if exists "Buyers can read their order items" on public.order_items;
create policy "Buyers can read their order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_id = auth.uid()
    )
  );

create or replace function public.reserve_event_tickets(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_reservation_key text
)
returns table (order_id uuid, expires_at timestamptz, subtotal_mga bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket public.ticket_types%rowtype;
  v_event public.events%rowtype;
  v_existing public.orders%rowtype;
  v_order_id uuid;
  v_expires_at timestamptz;
  v_subtotal bigint;
begin
  if v_user_id is null then
    raise exception 'Connecte-toi pour réserver des billets';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'Tu peux réserver de 1 à 10 billets par commande';
  end if;

  if p_reservation_key is null or char_length(p_reservation_key) < 20 or char_length(p_reservation_key) > 100 then
    raise exception 'Clé de réservation invalide';
  end if;

  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    raise exception 'Profil utilisateur introuvable';
  end if;

  -- Serialize retries using the same buyer/key pair before checking the unique key.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text), hashtext(p_reservation_key));

  -- Idempotency: a retry with the same key returns the original reservation.
  select * into v_existing
  from public.orders o
  where o.buyer_id = v_user_id and o.reservation_key = p_reservation_key;

  if found then
    return query select v_existing.id, v_existing.expires_at, v_existing.subtotal_mga;
    return;
  end if;

  -- Lock the event against unpublishing first, then lock its inventory row.
  -- FOR SHARE allows concurrent reservations while blocking a status change.
  select e.* into v_event
  from public.events e
  join public.ticket_types t on t.event_id = e.id
  where t.id = p_ticket_type_id
  for share of e;

  if not found or v_event.status <> 'published' or v_event.starts_at <= now() then
    raise exception 'Cet événement n’est plus disponible à la réservation';
  end if;

  -- Release only this event's expired holds after taking its shared lock.
  with expired_orders as (
    update public.orders o
    set status = 'cancelled'
    where o.event_id = v_event.id
      and o.status = 'pending'
      and o.expires_at is not null
      and o.expires_at <= now()
    returning o.id
  ), expired_quantities as (
    select oi.ticket_type_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    join expired_orders eo on eo.id = oi.order_id
    group by oi.ticket_type_id
  )
  update public.ticket_types tt
  set quantity_reserved = greatest(0, tt.quantity_reserved - eq.quantity)
  from expired_quantities eq
  where tt.id = eq.ticket_type_id;

  -- Competing requests for the same ticket category serialize on this row.
  select * into v_ticket
  from public.ticket_types
  where id = p_ticket_type_id
  for update;

  if not found or v_ticket.event_id <> v_event.id then
    raise exception 'Catégorie de billet introuvable';
  end if;

  if (v_ticket.sales_start is not null and v_ticket.sales_start > now())
     or (v_ticket.sales_end is not null and v_ticket.sales_end <= now()) then
    raise exception 'La vente de cette catégorie n’est pas ouverte';
  end if;

  if v_ticket.quantity_total - v_ticket.quantity_sold - v_ticket.quantity_reserved < p_quantity then
    raise exception 'Il ne reste pas assez de billets dans cette catégorie';
  end if;

  v_subtotal := v_ticket.price_mga * p_quantity;
  v_expires_at := now() + interval '15 minutes';

  insert into public.orders (
    buyer_id, event_id, status, currency, subtotal_mga, expires_at, reservation_key
  ) values (
    v_user_id, v_event.id, 'pending', 'MGA', v_subtotal, v_expires_at, p_reservation_key
  ) returning id into v_order_id;

  insert into public.order_items (order_id, ticket_type_id, quantity, unit_price_mga)
  values (v_order_id, v_ticket.id, p_quantity, v_ticket.price_mga);

  update public.ticket_types
  set quantity_reserved = quantity_reserved + p_quantity
  where id = v_ticket.id;

  return query select v_order_id, v_expires_at, v_subtotal;
end;
$$;

revoke all on function public.reserve_event_tickets(uuid, integer, text) from public, anon;
grant execute on function public.reserve_event_tickets(uuid, integer, text) to authenticated;

-- Direct client writes remain disabled; only the transaction above reserves inventory.


-- ============================================================================
-- MIGRATION: 202611090009_release_expired_reservations_on_event_changes.sql
-- ============================================================================

-- Reusable cleanup for expired, unpaid reservations.
create or replace function public.release_expired_ticket_reservations(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  if p_event_id is null then
    raise exception 'Event ID is required';
  end if;

  with expired_orders as (
    update public.orders o
    set status = 'cancelled'
    where o.event_id = p_event_id
      and o.status = 'pending'
      and o.expires_at is not null
      and o.expires_at <= now()
    returning o.id
  ), expired_quantities as (
    select oi.ticket_type_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    join expired_orders eo on eo.id = oi.order_id
    group by oi.ticket_type_id
  )
  update public.ticket_types tt
  set quantity_reserved = greatest(0, tt.quantity_reserved - eq.quantity)
  from expired_quantities eq
  where tt.id = eq.ticket_type_id;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.release_expired_ticket_reservations(uuid) from public, anon, authenticated;

-- Event owners can now unpublish once expired unpaid holds have been released.
create or replace function public.set_organizer_event_publication(
  p_event_id uuid,
  p_publish boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_publish is null then
    raise exception 'Publication decision is required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and role = 'organizer'
  ) then
    raise exception 'Approved organizer access required';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id and organizer_id = v_user_id
  for update;

  if not found then
    raise exception 'Event not found or not owned by this organizer';
  end if;

  if p_publish then
    if v_event.status <> 'draft' then
      raise exception 'Only draft events can be published';
    end if;

    if v_event.starts_at <= now()
       or char_length(trim(v_event.title)) < 4
       or char_length(trim(v_event.description)) < 30
       or char_length(trim(v_event.city)) = 0
       or char_length(trim(v_event.venue)) = 0
       or char_length(trim(coalesce(v_event.address, ''))) = 0 then
      raise exception 'Complete the event details and choose a future date before publishing';
    end if;

    if not exists (
      select 1 from public.ticket_types t
      where t.event_id = v_event.id
        and t.quantity_total > t.quantity_sold
        and t.price_mga >= 0
        and char_length(trim(t.name)) > 0
    ) then
      raise exception 'At least one valid ticket category is required';
    end if;

    update public.events
    set status = 'published', updated_at = now()
    where id = v_event.id;
  else
    if v_event.status <> 'published' then
      raise exception 'Only published events can be unpublished';
    end if;

    perform public.release_expired_ticket_reservations(v_event.id);

    if exists (
      select 1 from public.orders o
      where o.event_id = v_event.id
        and o.status in ('pending', 'paid')
    ) then
      raise exception 'This event has active reservations or paid orders; use the cancellation and refund process instead';
    end if;

    update public.events
    set status = 'draft', updated_at = now()
    where id = v_event.id;
  end if;
end;
$$;

revoke all on function public.set_organizer_event_publication(uuid, boolean) from public, anon;
grant execute on function public.set_organizer_event_publication(uuid, boolean) to authenticated;


-- ============================================================================
-- MIGRATION: 202611090010_protect_ticket_inventory.sql
-- ============================================================================

-- Inventory counters may only be changed by trusted transactional server functions.
create or replace function public.guard_ticket_inventory_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.quantity_sold, 0) <> 0
       or coalesce(new.quantity_reserved, 0) <> 0 then
      raise exception 'Ticket inventory counters are server-managed';
    end if;
  elsif new.quantity_sold is distinct from old.quantity_sold
     or new.quantity_reserved is distinct from old.quantity_reserved then
    raise exception 'Ticket inventory counters are server-managed';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_ticket_inventory_columns on public.ticket_types;
create trigger guard_ticket_inventory_columns
before insert or update of quantity_sold, quantity_reserved on public.ticket_types
for each row execute function public.guard_ticket_inventory_columns();


-- ============================================================================
-- MIGRATION: 202611090011_lock_published_ticket_types.sql
-- ============================================================================

-- Published ticket categories are immutable from organizer clients.
-- The reservation/payment server functions retain their SECURITY DEFINER access.
drop policy if exists "Approved organizers manage ticket types for their events" on public.ticket_types;
drop policy if exists "Organizers manage ticket types for their events" on public.ticket_types;

create policy "Approved organizers manage ticket types for draft events"
  on public.ticket_types
  for all to authenticated
  using (
    exists (
      select 1
      from public.events e
      join public.profiles p on p.id = e.organizer_id
      where e.id = event_id
        and e.organizer_id = auth.uid()
        and p.role = 'organizer'
        and e.status = 'draft'
    )
  )
  with check (
    exists (
      select 1
      from public.events e
      join public.profiles p on p.id = e.organizer_id
      where e.id = event_id
        and e.organizer_id = auth.uid()
        and p.role = 'organizer'
        and e.status = 'draft'
    )
  );


-- ============================================================================
-- MIGRATION: 202611090012_atomic_ticket_check_in.sql
-- ============================================================================

-- Atomic QR check-in. The QR payload is a random opaque token; only its SHA-256
-- digest is stored in tickets.qr_token_hash. No personal data belongs in the QR.
create or replace function public.check_in_ticket(p_qr_token text)
returns table (
  ticket_id uuid,
  event_id uuid,
  event_title text,
  ticket_type_name text,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket record;
  v_checked_at timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Connecte-toi avec un compte organisateur.';
  end if;

  if p_qr_token is null or length(p_qr_token) < 32 or length(p_qr_token) > 512 then
    raise exception 'QR code invalide.';
  end if;

  select
    t.id as ticket_id,
    t.status as ticket_status,
    t.checked_in_at,
    e.id as event_id,
    e.title as event_title,
    e.organizer_id,
    e.status as event_status,
    tt.name as ticket_type_name
  into v_ticket
  from public.tickets t
  join public.orders o on o.id = t.order_id
  join public.ticket_types tt on tt.id = t.ticket_type_id
  join public.events e on e.id = o.event_id and e.id = tt.event_id
  where t.qr_token_hash = encode(digest(convert_to(p_qr_token, 'UTF8'), 'sha256'), 'hex')
  for update of t;

  if not found then
    raise exception 'Billet introuvable : QR code non reconnu.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.role in ('organizer', 'admin')
  ) then
    raise exception 'Seuls les organisateurs approuvés peuvent contrôler les billets.';
  end if;

  if v_ticket.organizer_id <> v_user_id and not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.role = 'admin'
  ) then
    raise exception 'Ce billet appartient à un autre organisateur.';
  end if;

  if v_ticket.ticket_status <> 'valid' then
    if v_ticket.ticket_status = 'used' then
      raise exception 'Billet déjà utilisé le %.', to_char(v_ticket.checked_in_at at time zone 'Indian/Antananarivo', 'DD/MM/YYYY à HH24:MI');
    end if;
    raise exception 'Ce billet est annulé ou remboursé.';
  end if;

  if v_ticket.event_status not in ('published', 'completed') then
    raise exception 'Cet événement n’est pas ouvert au contrôle.';
  end if;

  update public.tickets
  set status = 'used', checked_in_at = v_checked_at
  where id = v_ticket.ticket_id and status = 'valid';

  if not found then
    raise exception 'Ce billet vient déjà d’être contrôlé.';
  end if;

  return query select
    v_ticket.ticket_id,
    v_ticket.event_id,
    v_ticket.event_title,
    v_ticket.ticket_type_name,
    v_checked_at;
end;
$$;

revoke all on function public.check_in_ticket(text) from public, anon;
grant execute on function public.check_in_ticket(text) to authenticated;

-- The function is the only client-accessible path for check-in; direct ticket
-- updates remain blocked by RLS and the existing inventory protections.


-- ============================================================================
-- MIGRATION: 202611090013_verified_payment_ticket_issuance.sql
-- ============================================================================

-- Finalize only a payment already verified by a trusted provider webhook.
-- The caller (normally a Supabase Edge Function) creates deterministic ticket
-- IDs and QR tokens before calling this RPC, and must deliver those same tokens
-- securely to the buyer. This function stores only SHA-256 token digests.
create or replace function public.finalize_verified_order_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_transaction_id text,
  p_gross_amount_mga bigint,
  p_provider_fee_mga bigint,
  p_tickets jsonb
)
returns table (ticket_id uuid, ticket_type_id uuid, holder_name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_order public.orders%rowtype;
  v_buyer_name text;
  v_commission_bps integer := 0;
  v_commission_mga bigint := 0;
  v_net_mga bigint := 0;
  v_ticket_count integer;
  v_expected_count integer;
  v_existing_payment public.payment_records%rowtype;
  v_inventory record;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Cette opération est réservée au serveur de paiement.';
  end if;

  if p_order_id is null
     or p_provider is null or length(trim(p_provider)) not between 2 and 40
     or p_provider_transaction_id is null
     or length(trim(p_provider_transaction_id)) not between 3 and 200
     or p_gross_amount_mga is null or p_gross_amount_mga < 0
     or p_provider_fee_mga is null or p_provider_fee_mga < 0
     or p_tickets is null or jsonb_typeof(p_tickets) <> 'array' then
    raise exception 'Données de confirmation de paiement invalides.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Commande introuvable.';
  end if;

  if p_gross_amount_mga <> v_order.subtotal_mga
     or p_provider_fee_mga > p_gross_amount_mga then
    raise exception 'Le montant confirmé ne correspond pas à la commande.';
  end if;

  select count(*) into v_ticket_count
  from jsonb_to_recordset(p_tickets) as x(
    ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
  );

  select coalesce(sum(oi.quantity), 0)::integer into v_expected_count
  from public.order_items oi where oi.order_id = p_order_id;

  if v_ticket_count < 1 or v_ticket_count <> v_expected_count then
    raise exception 'Le nombre de billets ne correspond pas à la réservation.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_tickets) as x(
      ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
    )
    where x.ticket_id is null
       or x.ticket_type_id is null
       or x.qr_token is null or length(x.qr_token) < 32 or length(x.qr_token) > 512
  ) then
    raise exception 'Un billet ou son jeton QR est invalide.';
  end if;

  if (select count(distinct x.ticket_id)
      from jsonb_to_recordset(p_tickets) as x(
        ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
      )) <> v_ticket_count
     or (select count(distinct x.qr_token)
         from jsonb_to_recordset(p_tickets) as x(
           ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
         )) <> v_ticket_count then
    raise exception 'Les identifiants et jetons QR doivent être uniques.';
  end if;

  if exists (
    select 1
    from (
      select oi.ticket_type_id, sum(oi.quantity)::integer as expected
      from public.order_items oi
      where oi.order_id = p_order_id
      group by oi.ticket_type_id
    ) expected
    full join (
      select x.ticket_type_id, count(*)::integer as actual
      from jsonb_to_recordset(p_tickets) as x(
        ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
      )
      group by x.ticket_type_id
    ) actual using (ticket_type_id)
    where coalesce(expected.expected, 0) <> coalesce(actual.actual, 0)
  ) then
    raise exception 'Les catégories des billets ne correspondent pas à la réservation.';
  end if;

  if v_order.status = 'paid' then
    select * into v_existing_payment
    from public.payment_records
    where order_id = p_order_id;

    if not found
       or v_existing_payment.provider <> p_provider
       or v_existing_payment.provider_transaction_id <> p_provider_transaction_id then
      raise exception 'Cette commande a déjà été réglée avec une autre transaction.';
    end if;

    -- Idempotent retry: require exactly the same ticket IDs and token digests.
    if exists (
      select 1
      from jsonb_to_recordset(p_tickets) as x(
        ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
      )
      left join public.tickets t
        on t.id = x.ticket_id
       and t.ticket_type_id = x.ticket_type_id
       and t.qr_token_hash = encode(digest(convert_to(x.qr_token, 'UTF8'), 'sha256'), 'hex')
      where t.id is null
    ) then
      raise exception 'La reprise ne correspond pas aux billets déjà émis.';
    end if;

    return query
      select t.id, t.ticket_type_id, t.holder_name
      from public.tickets t
      join jsonb_to_recordset(p_tickets) as x(
        ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
      ) on x.ticket_id = t.id
       and x.ticket_type_id = t.ticket_type_id
       and t.qr_token_hash = encode(digest(convert_to(x.qr_token, 'UTF8'), 'sha256'), 'hex')
      order by t.created_at, t.id;
    return;
  end if;

  if v_order.status <> 'pending'
     or v_order.expires_at is null
     or v_order.expires_at <= now() then
    raise exception 'La réservation a expiré ou n’est plus payable.';
  end if;

  if exists (
    select 1 from public.payment_records pr
    where pr.provider_transaction_id = p_provider_transaction_id
  ) then
    raise exception 'Cette référence de transaction est déjà utilisée.';
  end if;

  select p.display_name into v_buyer_name
  from public.profiles p where p.id = v_order.buyer_id;

  select oct.commission_bps into v_commission_bps
  from public.organizer_commission_terms oct
  join public.events e on e.organizer_id = oct.organizer_id
  where e.id = v_order.event_id and oct.accepted_at is not null
  order by oct.accepted_at desc
  limit 1;

  v_commission_bps := coalesce(v_commission_bps, 0);
  v_commission_mga := floor((p_gross_amount_mga * v_commission_bps)::numeric / 10000)::bigint;
  v_net_mga := p_gross_amount_mga - p_provider_fee_mga - v_commission_mga;

  if v_net_mga < 0 then
    raise exception 'Les frais dépassent le montant encaissé.';
  end if;

  -- Lock and convert each reserved quantity into sold quantity.
  for v_inventory in
    select oi.ticket_type_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = p_order_id
    group by oi.ticket_type_id
  loop
    update public.ticket_types tt
    set quantity_reserved = tt.quantity_reserved - v_inventory.quantity,
        quantity_sold = tt.quantity_sold + v_inventory.quantity
    where tt.id = v_inventory.ticket_type_id
      and tt.quantity_reserved >= v_inventory.quantity
      and tt.quantity_sold + v_inventory.quantity <= tt.quantity_total;

    if not found then
      raise exception 'Le stock réservé ne correspond plus à cette commande.';
    end if;
  end loop;

  insert into public.tickets (
    id, order_id, ticket_type_id, holder_name, qr_token_hash, status
  )
  select
    x.ticket_id,
    p_order_id,
    x.ticket_type_id,
    coalesce(nullif(trim(x.holder_name), ''), nullif(trim(v_buyer_name), ''), 'Participant'),
    encode(digest(convert_to(x.qr_token, 'UTF8'), 'sha256'), 'hex'),
    'valid'
  from jsonb_to_recordset(p_tickets) as x(
    ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
  );

  insert into public.payment_records (
    order_id, provider, provider_transaction_id, status,
    gross_amount_mga, provider_fee_mga, platform_commission_mga,
    organizer_net_mga, idempotency_key, confirmed_at
  ) values (
    p_order_id, trim(p_provider), trim(p_provider_transaction_id), 'succeeded',
    p_gross_amount_mga, p_provider_fee_mga, v_commission_mga,
    v_net_mga, 'provider:' || trim(p_provider) || ':' || trim(p_provider_transaction_id),
    now()
  );

  update public.orders
  set status = 'paid',
      payment_provider = trim(p_provider),
      provider_reference = trim(p_provider_transaction_id),
      paid_at = now()
  where id = p_order_id;

  return query
    select t.id, t.ticket_type_id, t.holder_name
    from public.tickets t
    where t.order_id = p_order_id
    order by t.created_at, t.id;
end;
$$;

revoke all on function public.finalize_verified_order_payment(uuid, text, text, bigint, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_verified_order_payment(uuid, text, text, bigint, bigint, jsonb) to service_role;

-- This RPC trusts only a server-side caller that has independently verified the
-- provider signature/status. Never call it from the mobile client or on redirects.


-- ============================================================================
-- MIGRATION: 202611100001_organizer_checkin_activity.sql
-- ============================================================================

-- Secure organizer attendance statistics and recent check-in history.
-- Both functions are read-only and return data only for the caller's events.
create or replace function public.organizer_attendance_stats()
returns table (
  event_id uuid,
  event_title text,
  event_city text,
  event_starts_at timestamptz,
  tickets_issued bigint,
  tickets_valid bigint,
  tickets_checked_in bigint,
  last_check_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.account_role;
begin
  if v_user_id is null then
    raise exception 'Connecte-toi pour consulter cette activité.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_user_id;

  if v_role is null or v_role not in ('organizer', 'admin') then
    raise exception 'Accès réservé aux organisateurs approuvés.';
  end if;

  return query
  select
    e.id,
    e.title,
    e.city,
    e.starts_at,
    count(t.id) filter (where o.status = 'paid'),
    count(t.id) filter (where o.status = 'paid' and t.status = 'valid'),
    count(t.id) filter (where o.status = 'paid' and t.status = 'used'),
    max(t.checked_in_at) filter (where o.status = 'paid' and t.status = 'used')
  from public.events e
  left join public.orders o on o.event_id = e.id and o.status = 'paid'
  left join public.tickets t on t.order_id = o.id
  where v_role = 'admin' or e.organizer_id = v_user_id
  group by e.id, e.title, e.city, e.starts_at
  order by e.starts_at desc;
end;
$$;

create or replace function public.organizer_checkin_history()
returns table (
  ticket_id uuid,
  event_id uuid,
  event_title text,
  ticket_type_name text,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.account_role;
begin
  if v_user_id is null then
    raise exception 'Connecte-toi pour consulter cet historique.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_user_id;

  if v_role is null or v_role not in ('organizer', 'admin') then
    raise exception 'Accès réservé aux organisateurs approuvés.';
  end if;

  return query
  select
    t.id,
    e.id,
    e.title,
    tt.name,
    t.checked_in_at
  from public.events e
  join public.orders o on o.event_id = e.id and o.status = 'paid'
  join public.tickets t on t.order_id = o.id
  join public.ticket_types tt on tt.id = t.ticket_type_id
  where (v_role = 'admin' or e.organizer_id = v_user_id)
    and t.status = 'used'
    and t.checked_in_at is not null
  order by t.checked_in_at desc
  limit 100;
end;
$$;

revoke all on function public.organizer_attendance_stats() from public, anon;
revoke all on function public.organizer_checkin_history() from public, anon;
grant execute on function public.organizer_attendance_stats() to authenticated;
grant execute on function public.organizer_checkin_history() to authenticated;
