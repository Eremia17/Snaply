-- Reject users without a profile role explicitly; NULL must not bypass the role check.
create or replace function public.organizer_order_overview()
returns table (
  order_id uuid,
  event_id uuid,
  event_title text,
  event_city text,
  event_starts_at timestamptz,
  buyer_name text,
  order_status public.order_status,
  subtotal_mga bigint,
  quantity_total bigint,
  ticket_summary text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.account_role;
begin
  if v_user_id is null then
    raise exception 'Connexion nécessaire.';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_user_id;

  if v_role is null or v_role not in ('organizer', 'admin') then
    raise exception 'Accès réservé aux organisateurs.';
  end if;

  return query
  select
    o.id,
    e.id,
    e.title,
    e.city,
    e.starts_at,
    coalesce(nullif(trim(p.display_name), ''), 'Spectateur'),
    o.status,
    o.subtotal_mga,
    coalesce(sum(oi.quantity), 0)::bigint,
    coalesce(string_agg(tt.name || ' × ' || oi.quantity::text, ', ' order by tt.name), 'Aucun billet'),
    o.created_at,
    o.expires_at
  from public.orders o
  join public.events e on e.id = o.event_id
  join public.profiles p on p.id = o.buyer_id
  left join public.order_items oi on oi.order_id = o.id
  left join public.ticket_types tt on tt.id = oi.ticket_type_id
  where (v_role = 'admin' or e.organizer_id = v_user_id)
  group by o.id, e.id, e.title, e.city, e.starts_at, p.display_name
  order by o.created_at desc
  limit 200;
end;
$$;

revoke all on function public.organizer_order_overview() from public, anon;
grant execute on function public.organizer_order_overview() to authenticated;
