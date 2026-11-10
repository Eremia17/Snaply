-- On-site payment model: keep a reservation active until the event starts.
-- No online payment provider is enabled by this migration.

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
  -- Keep the inventory reserved until the event begins; payment is settled in person.
  v_expires_at := v_event.starts_at;

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
