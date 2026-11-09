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
  for v_existing_payment in
    select oi.ticket_type_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = p_order_id
    group by oi.ticket_type_id
  loop
    update public.ticket_types tt
    set quantity_reserved = tt.quantity_reserved - v_existing_payment.quantity,
        quantity_sold = tt.quantity_sold + v_existing_payment.quantity
    where tt.id = v_existing_payment.ticket_type_id
      and tt.quantity_reserved >= v_existing_payment.quantity
      and tt.quantity_sold + v_existing_payment.quantity <= tt.quantity_total;

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
