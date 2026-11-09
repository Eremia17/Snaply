-- Reusable cleanup for expired, unpaid reservations.
create or replace function public.release_expired_ticket_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  with expired_orders as (
    update public.orders o
    set status = 'cancelled'
    where o.status = 'pending'
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

revoke all on function public.release_expired_ticket_reservations() from public, anon, authenticated;

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

    perform public.release_expired_ticket_reservations();

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
