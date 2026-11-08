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
