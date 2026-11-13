-- AdEarn core schema
-- Apply only to a dedicated AdEarn Supabase project.
-- No demo users, fake missions, or fake wallet balances are inserted.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Account profile and wallet identity are created automatically on signup.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'AdEarn member'
    check (char_length(display_name) between 2 and 60),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  role text not null default 'member'
    check (role in ('member', 'support', 'admin')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_display_name text;
begin
  safe_display_name := coalesce(
    case
      when pg_catalog.char_length(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name')) >= 2
      then pg_catalog.left(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), 60)
    end,
    case
      when pg_catalog.char_length(pg_catalog.split_part(coalesce(new.email, ''), '@', 1)) >= 2
      then pg_catalog.left(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), 60)
    end,
    'AdEarn member'
  );

  insert into public.profiles (id, display_name)
  values (new.id, safe_display_name)
  on conflict (id) do nothing;

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists on_auth_user_created_adearn on auth.users;
create trigger on_auth_user_created_adearn
after insert on auth.users
for each row execute function private.handle_new_user();

-- Backfill accounts that already existed before this schema was installed.
insert into public.profiles (id, display_name)
select
  users.id,
  coalesce(
    case
      when pg_catalog.char_length(pg_catalog.btrim(users.raw_user_meta_data ->> 'display_name')) >= 2
      then pg_catalog.left(pg_catalog.btrim(users.raw_user_meta_data ->> 'display_name'), 60)
    end,
    case
      when pg_catalog.char_length(pg_catalog.split_part(coalesce(users.email, ''), '@', 1)) >= 2
      then pg_catalog.left(pg_catalog.split_part(coalesce(users.email, ''), '@', 1), 60)
    end,
    'AdEarn member'
  )
from auth.users as users
on conflict (id) do nothing;

insert into public.wallets (user_id)
select users.id from auth.users as users
on conflict (user_id) do nothing;

-- Approved partners only. No API secrets or credentials belong in this table.
create table if not exists public.ad_providers (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  website_url text check (website_url is null or website_url ~ '^https://'),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'disabled')),
  incentivized_tasks_allowed boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

drop trigger if exists providers_set_updated_at on public.ad_providers;
create trigger providers_set_updated_at
before update on public.ad_providers
for each row execute function private.set_updated_at();

create table if not exists public.tasks (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  provider_id uuid references public.ad_providers(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 5 and 140),
  description text not null check (char_length(description) between 10 and 6000),
  category text not null check (category in ('survey', 'audio', 'microtask', 'video')),
  reward_amount numeric(14,2) not null check (reward_amount > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  estimated_minutes integer
    check (estimated_minutes is null or estimated_minutes between 1 and 1440),
  instructions jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(instructions) = 'array'),
  requirements jsonb not null default '{}'::jsonb
    check (pg_catalog.jsonb_typeof(requirements) = 'object'),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (status <> 'published' or published_at is not null)
);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();

-- One submission per member per task in the initial release.
-- Review fields and status are changed only by trusted server workflows.
create table if not exists public.task_attempts (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'approved', 'rejected')),
  submission_data jsonb not null default '{}'::jsonb
    check (
      pg_catalog.jsonb_typeof(submission_data) = 'object'
      and pg_catalog.octet_length(submission_data::text) <= 32768
    ),
  submitted_at timestamptz not null default pg_catalog.now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 2000),
  created_at timestamptz not null default pg_catalog.now(),
  unique (user_id, task_id)
);

-- Immutable append-only ledger. A wallet balance is calculated from entries.
create table if not exists public.transactions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null
    check (entry_type in ('task_reward', 'withdrawal', 'adjustment', 'reversal')),
  direction text not null check (direction in ('credit', 'debit')),
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  source_type text not null
    check (source_type in ('task_attempt', 'withdrawal', 'admin_adjustment')),
  source_id uuid,
  idempotency_key text not null unique
    check (char_length(idempotency_key) between 8 and 180),
  description text,
  metadata jsonb not null default '{}'::jsonb
    check (pg_catalog.jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  check (
    (entry_type = 'task_reward' and direction = 'credit'
      and source_type = 'task_attempt' and source_id is not null)
    or (entry_type = 'withdrawal' and direction = 'debit'
      and source_type = 'withdrawal' and source_id is not null)
    or (entry_type = 'adjustment' and source_type = 'admin_adjustment')
    or (entry_type = 'reversal')
  )
);

create or replace function private.prevent_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Ledger entries are immutable; create a reversal entry instead.'
    using errcode = '55000';
end;
$$;

revoke all on function private.prevent_ledger_mutation() from public, anon, authenticated;

drop trigger if exists transactions_are_immutable on public.transactions;
create trigger transactions_are_immutable
before update or delete on public.transactions
for each row execute function private.prevent_ledger_mutation();

create unique index if not exists transactions_one_task_reward_per_attempt
  on public.transactions(source_id)
  where entry_type = 'task_reward' and source_type = 'task_attempt';

create table if not exists public.withdrawals (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  payout_method text not null check (char_length(payout_method) between 2 and 60),
  payout_details jsonb not null default '{}'::jsonb
    check (pg_catalog.jsonb_typeof(payout_details) = 'object'),
  status text not null default 'requested'
    check (status in ('requested', 'under_review', 'approved', 'rejected', 'paid', 'cancelled')),
  requested_at timestamptz not null default pg_catalog.now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 1000),
  created_at timestamptz not null default pg_catalog.now()
);

create table if not exists public.admin_logs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 2 and 100),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id uuid,
  details jsonb not null default '{}'::jsonb
    check (pg_catalog.jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default pg_catalog.now()
);

-- Indexes for catalogue queries, ownership policies and account history.
create index if not exists tasks_public_catalogue_idx
  on public.tasks(status, published_at desc, created_at desc);
create index if not exists tasks_provider_id_idx on public.tasks(provider_id);
create index if not exists task_attempts_user_created_idx
  on public.task_attempts(user_id, created_at desc);
create index if not exists task_attempts_task_status_idx
  on public.task_attempts(task_id, status);
create index if not exists transactions_user_created_idx
  on public.transactions(user_id, created_at desc);
create index if not exists withdrawals_user_created_idx
  on public.withdrawals(user_id, requested_at desc);
create index if not exists admin_logs_created_idx on public.admin_logs(created_at desc);

-- RLS is enabled on every public table created by this schema.
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.ad_providers enable row level security;
alter table public.tasks enable row level security;
alter table public.task_attempts enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.admin_logs enable row level security;

revoke all on table
  public.profiles, public.wallets, public.ad_providers, public.tasks,
  public.task_attempts, public.transactions, public.withdrawals, public.admin_logs
from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.ad_providers, public.tasks to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, country_code) on public.profiles to authenticated;
grant select on public.task_attempts to authenticated;
grant insert (task_id, user_id, submission_data) on public.task_attempts to authenticated;
grant select on public.wallets, public.transactions, public.withdrawals to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists wallets_select_own on public.wallets;
create policy wallets_select_own on public.wallets
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists ad_providers_select_approved on public.ad_providers;
create policy ad_providers_select_approved on public.ad_providers
for select to anon, authenticated
using (status = 'active' and incentivized_tasks_allowed = true);

drop policy if exists tasks_select_published on public.tasks;
create policy tasks_select_published on public.tasks
for select to anon, authenticated
using (
  status = 'published'
  and published_at <= pg_catalog.now()
  and (ends_at is null or ends_at > pg_catalog.now())
  and (
    provider_id is null
    or exists (
      select 1 from public.ad_providers as provider
      where provider.id = tasks.provider_id
        and provider.status = 'active'
        and provider.incentivized_tasks_allowed = true
    )
  )
);

drop policy if exists task_attempts_select_own on public.task_attempts;
create policy task_attempts_select_own on public.task_attempts
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists task_attempts_insert_own on public.task_attempts;
create policy task_attempts_insert_own on public.task_attempts
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'submitted'
  and reviewed_at is null
  and reviewed_by is null
  and exists (
    select 1 from public.tasks as task
    where task.id = task_id
      and task.status = 'published'
      and task.published_at <= pg_catalog.now()
      and (task.starts_at is null or task.starts_at <= pg_catalog.now())
      and (task.ends_at is null or task.ends_at > pg_catalog.now())
  )
);

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists withdrawals_select_own on public.withdrawals;
create policy withdrawals_select_own on public.withdrawals
for select to authenticated
using ((select auth.uid()) = user_id);

-- admin_logs deliberately has no client grants or policies.

-- The view uses caller permissions and therefore respects underlying RLS.
create or replace view public.wallet_balances
with (security_invoker = true)
as
select
  user_id,
  currency_code,
  pg_catalog.sum(case when direction = 'credit' then amount else -amount end) as balance,
  pg_catalog.sum(case when direction = 'credit' and entry_type = 'task_reward' then amount else 0 end)
    as lifetime_task_rewards,
  pg_catalog.sum(case when direction = 'debit' and entry_type = 'withdrawal' then amount else 0 end)
    as lifetime_withdrawals
from public.transactions
group by user_id, currency_code;

grant select on public.wallet_balances to authenticated;

comment on table public.profiles is
  'AdEarn public profile. Role is server-managed and never editable by the account owner.';
comment on table public.tasks is
  'Task catalogue. A published task with a provider requires an approved incentivized-task partner.';
comment on table public.task_attempts is
  'User submissions. Client submissions are untrusted until reviewed by trusted server code.';
comment on table public.transactions is
  'Immutable financial ledger. Entries are inserted only by trusted server workflows after verification.';
comment on table public.withdrawals is
  'Withdrawal records. Members have read-only access; all state changes are server-side.';
comment on table public.admin_logs is
  'Internal audit trail with no direct access from anon or authenticated client roles.';
comment on view public.wallet_balances is
  'Read-only balance projection calculated from immutable ledger entries.';


-- Admin access is assigned manually by a trusted project owner.
-- Never expose role updates to client users.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
for select to authenticated
using ((select private.is_admin()));

drop policy if exists wallets_select_admin on public.wallets;
create policy wallets_select_admin on public.wallets
for select to authenticated
using ((select private.is_admin()));

drop policy if exists providers_select_admin on public.ad_providers;
create policy providers_select_admin on public.ad_providers
for select to authenticated
using ((select private.is_admin()));

drop policy if exists tasks_select_admin on public.tasks;
create policy tasks_select_admin on public.tasks
for select to authenticated
using ((select private.is_admin()));

drop policy if exists attempts_select_admin on public.task_attempts;
create policy attempts_select_admin on public.task_attempts
for select to authenticated
using ((select private.is_admin()));

drop policy if exists transactions_select_admin on public.transactions;
create policy transactions_select_admin on public.transactions
for select to authenticated
using ((select private.is_admin()));

drop policy if exists withdrawals_select_admin on public.withdrawals;
create policy withdrawals_select_admin on public.withdrawals
for select to authenticated
using ((select private.is_admin()));

drop policy if exists admin_logs_select_admin on public.admin_logs;
create policy admin_logs_select_admin on public.admin_logs
for select to authenticated
using ((select private.is_admin()));

comment on function private.is_admin() is
  'Checks the database-managed profile role for the current authenticated user. Role changes must be performed by a trusted project owner.';


-- Atomic admin review workflow. This changes only the submission review state;
-- it never inserts a wallet transaction or creates a payable reward.
create or replace function public.admin_review_task_attempt(
  p_attempt_id uuid,
  p_decision text,
  p_note text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_actor uuid;
  current_status text;
  clean_note text;
begin
  current_actor := (select auth.uid());

  if current_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = current_actor
      and profile.role = 'admin'
  ) then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision.' using errcode = '22023';
  end if;

  clean_note := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');
  if clean_note is not null and pg_catalog.char_length(clean_note) > 2000 then
    raise exception 'Review note is too long.' using errcode = '22023';
  end if;

  select attempt.status
    into current_status
  from public.task_attempts as attempt
  where attempt.id = p_attempt_id
  for update;

  if not found then
    raise exception 'Submission not found.' using errcode = 'P0002';
  end if;

  if current_status not in ('submitted', 'under_review') then
    raise exception 'This submission has already been reviewed.' using errcode = '55000';
  end if;

  update public.task_attempts
  set status = p_decision,
      reviewed_at = pg_catalog.now(),
      reviewed_by = current_actor,
      review_note = clean_note
  where id = p_attempt_id;

  insert into public.admin_logs (
    actor_id, action, entity_type, entity_id, details
  )
  values (
    current_actor,
    case when p_decision = 'approved' then 'task_attempt_approved' else 'task_attempt_rejected' end,
    'task_attempt',
    p_attempt_id,
    pg_catalog.jsonb_build_object('decision', p_decision, 'note', clean_note)
  );

  return p_decision;
end;
$$;

revoke all on function public.admin_review_task_attempt(uuid, text, text) from public, anon;
grant execute on function public.admin_review_task_attempt(uuid, text, text) to authenticated;

comment on function public.admin_review_task_attempt(uuid, text, text) is
  'Atomically approves or rejects one task submission for a database-authorized admin. Does not create a wallet credit.';


-- Admin mission studio: administrators can create and edit drafts and pause/archive tasks.
-- Publication is intentionally withheld until a real partner and funded reward budget are verified.
grant insert, update on public.tasks to authenticated;

drop policy if exists tasks_insert_admin_draft on public.tasks;
create policy tasks_insert_admin_draft on public.tasks
for insert to authenticated
with check (
  (select private.is_admin())
  and created_by = (select auth.uid())
  and status = 'draft'
  and published_at is null
);

drop policy if exists tasks_update_admin_managed on public.tasks;
create policy tasks_update_admin_managed on public.tasks
for update to authenticated
using (
  (select private.is_admin())
  and status in ('draft', 'published', 'paused')
)
with check (
  (select private.is_admin())
  and status in ('draft', 'paused', 'archived')
);

create or replace function private.log_admin_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
begin
  actor := (select auth.uid());
  if tg_op = 'INSERT' then
    insert into public.admin_logs(actor_id, action, entity_type, entity_id, details)
    values (actor, 'task_created_as_draft', 'task', new.id,
      pg_catalog.jsonb_build_object('slug', new.slug, 'title', new.title, 'status', new.status));
    return new;
  end if;

  insert into public.admin_logs(actor_id, action, entity_type, entity_id, details)
  values (actor, 'task_updated', 'task', new.id,
    pg_catalog.jsonb_build_object(
      'before', pg_catalog.jsonb_build_object('title', old.title, 'status', old.status),
      'after', pg_catalog.jsonb_build_object('title', new.title, 'status', new.status)
    ));
  return new;
end;
$$;

revoke all on function private.log_admin_task_change() from public, anon, authenticated;
drop trigger if exists tasks_admin_audit on public.tasks;
create trigger tasks_admin_audit
after insert or update on public.tasks
for each row execute function private.log_admin_task_change();

comment on function private.log_admin_task_change() is
  'Internal audit trigger for administrator task creation and status/content changes.';


-- The review RPC runs with caller privileges. RLS authorizes every write;
-- the function itself is not a SECURITY DEFINER privilege-escalation path.
grant update (status, reviewed_at, reviewed_by, review_note)
  on public.task_attempts to authenticated;
drop policy if exists attempts_update_admin on public.task_attempts;
create policy attempts_update_admin on public.task_attempts
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

grant insert (actor_id, action, entity_type, entity_id, details)
  on public.admin_logs to authenticated;
drop policy if exists admin_logs_insert_admin on public.admin_logs;
create policy admin_logs_insert_admin on public.admin_logs
for insert to authenticated
with check (
  (select private.is_admin())
  and actor_id = (select auth.uid())
);

comment on function public.admin_review_task_attempt(uuid, text, text) is
  'SECURITY INVOKER review RPC. RLS policies authorize admin-only updates and audit inserts; no wallet credit is created.';


-- Admin-managed partner registry. New providers are pending and cannot run
-- incentivized tasks until an admin records a verification source.
alter table public.ad_providers
  add column if not exists verification_url text
    check (verification_url is null or verification_url ~ '^https://'),
;

grant insert, update on public.ad_providers to authenticated;

drop policy if exists providers_insert_admin_pending on public.ad_providers;
create policy providers_insert_admin_pending on public.ad_providers
for insert to authenticated
with check (
  (select private.is_admin())
  and status = 'pending'
  and incentivized_tasks_allowed = false
);

drop policy if exists providers_update_admin_reviewed on public.ad_providers;
create policy providers_update_admin_reviewed on public.ad_providers
for update to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and (
    (
      status = 'active'
      and incentivized_tasks_allowed = true
      and verification_url is not null
    )
    or (
      status in ('pending', 'paused', 'disabled')
      and incentivized_tasks_allowed = false
    )
  )
);

create or replace function private.log_admin_provider_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
begin
  actor := (select auth.uid());
  if tg_op = 'INSERT' then
    insert into public.admin_logs(actor_id, action, entity_type, entity_id, details)
    values (actor, 'provider_created_pending', 'ad_provider', new.id,
      pg_catalog.jsonb_build_object('name', new.name, 'status', new.status));
    return new;
  end if;

  insert into public.admin_logs(actor_id, action, entity_type, entity_id, details)
  values (actor, 'provider_updated', 'ad_provider', new.id,
    pg_catalog.jsonb_build_object(
      'before', pg_catalog.jsonb_build_object('name', old.name, 'status', old.status),
      'after', pg_catalog.jsonb_build_object('name', new.name, 'status', new.status,
        'incentivized_tasks_allowed', new.incentivized_tasks_allowed,
        'verification_url', new.verification_url)
    ));
  return new;
end;
$$;

revoke all on function private.log_admin_provider_change() from public, anon, authenticated;
drop trigger if exists ad_providers_admin_audit on public.ad_providers;
create trigger ad_providers_admin_audit
after insert or update on public.ad_providers
for each row execute function private.log_admin_provider_change();
