-- Organizer-only attendance reporting. These SECURITY DEFINER functions expose
-- aggregate counts and minimal check-in metadata, never buyer contact details.
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
    raise exception 'Connecte-toi avec un compte organisateur.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_user_id;

  if v_role not in ('organizer', 'admin') then
    raise exception 'Accès réservé aux organisateurs approuvés.';
  end if;

  return query
  select
    e.id,
    e.title,
    e.city,
    e.starts_at,
    count(t.id)::bigint,
    count(t.id) filter (where t.status = 'valid')::bigint,
    count(t.id) filter (where t.status = 'used')::bigint,
    max(t.checked_in_at)
  from public.events e
  left join public.orders o on o.event_id = e.id and o.status = 'paid'
  left join public.tickets t on t.order_id = o.id
  where (v_role = 'admin' or e.organizer_id = v_user_id)
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
    raise exception 'Connecte-toi avec un compte organisateur.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_user_id;

  if v_role not in ('organizer', 'admin') then
    raise exception 'Accès réservé aux organisateurs approuvés.';
  end if;

  return query
  select
    t.id,
    e.id,
    e.title,
    tt.name,
    t.checked_in_at
  from public.tickets t
  join public.orders o on o.id = t.order_id and o.status = 'paid'
  join public.events e on e.id = o.event_id
  join public.ticket_types tt on tt.id = t.ticket_type_id
  where t.status = 'used'
    and t.checked_in_at is not null
    and (v_role = 'admin' or e.organizer_id = v_user_id)
  order by t.checked_in_at desc
  limit 100;
end;
$$;

revoke all on function public.organizer_attendance_stats() from public, anon;
revoke all on function public.organizer_checkin_history() from public, anon;
grant execute on function public.organizer_attendance_stats() to authenticated;
grant execute on function public.organizer_checkin_history() to authenticated;
