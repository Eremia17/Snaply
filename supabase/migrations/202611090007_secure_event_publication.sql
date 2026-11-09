-- Only the trusted publication RPC may change an event's public visibility.
create or replace function public.guard_event_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'Events must be created as drafts';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    raise exception 'Event publication changes require the trusted publication function';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_event_status on public.events;
create trigger guard_event_status
before insert or update of status on public.events
for each row execute function public.guard_event_status();

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

    if exists (
      select 1 from public.orders o
      where o.event_id = v_event.id
        and o.status in ('pending', 'paid')
    ) then
      raise exception 'This event has pending or paid orders; use the cancellation and refund process instead';
    end if;

    update public.events
    set status = 'draft', updated_at = now()
    where id = v_event.id;
  end if;
end;
$$;

revoke all on function public.set_organizer_event_publication(uuid, boolean) from public, anon;
grant execute on function public.set_organizer_event_publication(uuid, boolean) to authenticated;
