-- Secure manual on-site payment confirmation.
-- Only the authenticated Edge Function's service-role client can execute this RPC.
-- The organizer identity is revalidated against the event owner inside Postgres.

alter table public.payment_records
  add column if not exists confirmed_by uuid references public.profiles(id) on delete set null;

comment on column public.payment_records.confirmed_by is
  'Authenticated organizer/admin who confirmed an in-person settlement; null for provider webhooks.';

create or replace function public.confirm_onsite_order_payment(
  p_order_id uuid,
  p_confirmed_by uuid,
  p_tickets jsonb
)
returns table (ticket_id uuid, ticket_type_id uuid, holder_name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_order public.orders%rowtype;
  v_event public.events%rowtype;
  v_role public.account_role;
  v_buyer_name text;
  v_existing_payment public.payment_records%rowtype;
  v_ticket_count integer;
  v_expected_count integer;
  v_inventory record;
begin
  if p_order_id is null or p_confirmed_by is null
     or p_tickets is null or jsonb_typeof(p_tickets) <> 'array' then
    raise exception 'Données de confirmation invalides.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Réservation introuvable.';
  end if;

  select e.* into v_event
  from public.events e
  where e.id = v_order.event_id
  for share;

  if not found then
    raise exception 'Événement introuvable.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = p_confirmed_by;

  if v_role is null or (
    v_role <> 'admin'::public.account_role
    and not (
      v_role = 'organizer'::public.account_role
      and v_event.organizer_id = p_confirmed_by
    )
  ) then
    raise exception 'Tu n’es pas autorisé à confirmer ce paiement.';
  end if;

  select count(*) into v_ticket_count
  from jsonb_to_recordset(p_tickets) as x(
    ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
  );

  select coalesce(sum(oi.quantity), 0)::integer into v_expected_count
  from public.order_items oi
  where oi.order_id = p_order_id;

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
       or x.qr_token is null
       or x.qr_token !~ '^tm1_[a-f0-9]{64}$'
  ) then
    raise exception 'Un identifiant ou jeton QR est invalide.';
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
    raise exception 'Les catégories ne correspondent pas à la réservation.';
  end if;

  if v_order.status = 'paid' then
    select * into v_existing_payment
    from public.payment_records
    where order_id = p_order_id;

    if not found or v_existing_payment.provider <> 'onsite_cash'
       or v_existing_payment.confirmed_by <> p_confirmed_by then
      raise exception 'Cette réservation a déjà été réglée par un autre moyen.';
    end if;

    if exists (
      select 1
      from jsonb_to_recordset(p_tickets) as x(
        ticket_id uuid, ticket_type_id uuid, holder_name text, qr_token text
      )
      left join public.tickets t
        on t.id = x.ticket_id
       and t.order_id = p_order_id
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
     or v_order.expires_at <= now()
     or v_event.starts_at <= now() then
    raise exception 'La réservation a expiré ou ne peut plus être réglée.';
  end if;

  if v_event.status <> 'published' then
    raise exception 'Cet événement n’accepte plus de confirmation.';
  end if;

  if exists (
    select 1 from public.payment_records pr where pr.order_id = p_order_id
  ) then
    raise exception 'Un paiement est déjà enregistré pour cette réservation.';
  end if;

  select p.display_name into v_buyer_name
  from public.profiles p
  where p.id = v_order.buyer_id;

  -- Convert each reserved quantity into sold quantity in a stable lock order.
  for v_inventory in
    select oi.ticket_type_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = p_order_id
    group by oi.ticket_type_id
    order by oi.ticket_type_id
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
    organizer_net_mga, idempotency_key, confirmed_at, confirmed_by
  ) values (
    p_order_id, 'onsite_cash', 'onsite:' || p_order_id::text, 'succeeded',
    v_order.subtotal_mga, 0, 0,
    v_order.subtotal_mga, 'onsite:' || p_order_id::text, now(), p_confirmed_by
  );

  update public.orders
  set status = 'paid',
      payment_provider = 'onsite_cash',
      provider_reference = 'onsite:' || p_order_id::text,
      paid_at = now()
  where id = p_order_id;

  return query
    select t.id, t.ticket_type_id, t.holder_name
    from public.tickets t
    where t.order_id = p_order_id
    order by t.created_at, t.id;
end;
$$;

revoke all on function public.confirm_onsite_order_payment(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.confirm_onsite_order_payment(uuid, uuid, jsonb)
  to service_role;
