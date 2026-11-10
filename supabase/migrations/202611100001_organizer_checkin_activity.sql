-- Organizer activity dashboard: expose only aggregate figures and recent check-ins
-- belonging to the authenticated organizer (admins may inspect all events).
create or replace function public.get_organizer_checkin_activity(p_limit integer default 25)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.account_role;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Connecte-toi pour consulter cette activité.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_user_id;

  if v_role not in ('organizer', 'admin') then
    raise exception 'Accès réservé aux organisateurs approuvés.';
  end if;

  with owned_events as (
    select e.id, e.title, e.status
    from public.events e
    where v_role = 'admin' or e.organizer_id = v_user_id
  ),
  event_stats as (
    select
      count(*)::integer as events_total,
      count(*) filter (where status = 'published')::integer as events_published
    from owned_events
  ),
  ticket_stats as (
    select
      count(t.id)::integer as tickets_issued,
      count(t.id) filter (where t.status = 'used')::integer as tickets_checked_in
    from owned_events e
    join public.orders o on o.event_id = e.id and o.status = 'paid'
    join public.tickets t on t.order_id = o.id
  ),
  revenue_stats as (
    select coalesce(sum(pr.gross_amount_mga), 0)::bigint as gross_revenue_mga
    from owned_events e
    join public.orders o on o.event_id = e.id
    join public.payment_records pr on pr.order_id = o.id and pr.status = 'succeeded'
  ),
  recent_scans as (
    select coalesce(jsonb_agg(scan_row.payload order by scan_row.checked_in_at desc), '[]'::jsonb) as items
    from (
      select
        t.checked_in_at,
        jsonb_build_object(
          'ticket_id', t.id,
          'event_id', e.id,
          'event_title', e.title,
          'ticket_type_name', tt.name,
          'checked_in_at', t.checked_in_at
        ) as payload
      from owned_events e
      join public.orders o on o.event_id = e.id and o.status = 'paid'
      join public.tickets t on t.order_id = o.id
      join public.ticket_types tt on tt.id = t.ticket_type_id
      where t.status = 'used' and t.checked_in_at is not null
      order by t.checked_in_at desc
      limit greatest(1, least(coalesce(p_limit, 25), 50))
    ) scan_row
  )
  select jsonb_build_object(
    'events_total', es.events_total,
    'events_published', es.events_published,
    'tickets_issued', ts.tickets_issued,
    'tickets_checked_in', ts.tickets_checked_in,
    'gross_revenue_mga', rs.gross_revenue_mga,
    'recent_scans', scans.items
  )
  into v_result
  from event_stats es
  cross join ticket_stats ts
  cross join revenue_stats rs
  cross join recent_scans scans;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.get_organizer_checkin_activity(integer) from public, anon;
grant execute on function public.get_organizer_checkin_activity(integer) to authenticated;
