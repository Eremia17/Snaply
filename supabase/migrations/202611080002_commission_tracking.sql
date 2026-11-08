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
