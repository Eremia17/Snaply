-- Atomic create/update of an organizer's private event draft and ticket tiers.
create or replace function public.save_organizer_event_draft(
  p_event_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_city text,
  p_venue text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_ticket_tiers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
  v_tier jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and role = 'organizer'
  ) then
    raise exception 'Approved organizer access required';
  end if;

  if char_length(trim(coalesce(p_title, ''))) < 4
     or char_length(trim(coalesce(p_title, ''))) > 140
     or char_length(trim(coalesce(p_city, ''))) = 0
     or char_length(trim(coalesce(p_venue, ''))) = 0
     or p_starts_at is null
     or (p_ends_at is not null and p_ends_at <= p_starts_at)
     or jsonb_typeof(p_ticket_tiers) <> 'array'
     or jsonb_array_length(p_ticket_tiers) = 0 then
    raise exception 'Invalid event draft data';
  end if;

  for v_tier in select value from jsonb_array_elements(p_ticket_tiers)
  loop
    if char_length(trim(coalesce(v_tier->>'name', ''))) = 0
       or coalesce((v_tier->>'price_mga')::bigint, -1) < 0
       or coalesce((v_tier->>'quantity_total')::integer, -1) < 1 then
      raise exception 'Invalid ticket tier';
    end if;
  end loop;

  if p_event_id is null then
    insert into public.events (
      organizer_id, title, description, category, city, venue, starts_at, ends_at, status
    ) values (
      v_user_id, trim(p_title), coalesce(p_description, ''), coalesce(p_category, 'Autre'),
      trim(p_city), trim(p_venue), p_starts_at, p_ends_at, 'draft'
    ) returning id into v_event_id;
  else
    update public.events
    set title = trim(p_title),
        description = coalesce(p_description, ''),
        category = coalesce(p_category, 'Autre'),
        city = trim(p_city),
        venue = trim(p_venue),
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        updated_at = now()
    where id = p_event_id
      and organizer_id = v_user_id
      and status = 'draft'
    returning id into v_event_id;

    if v_event_id is null then
      raise exception 'Draft not found or cannot be edited';
    end if;

    delete from public.ticket_types where event_id = v_event_id;
  end if;

  insert into public.ticket_types (event_id, name, price_mga, quantity_total)
  select
    v_event_id,
    trim(tier->>'name'),
    (tier->>'price_mga')::bigint,
    (tier->>'quantity_total')::integer
  from jsonb_array_elements(p_ticket_tiers) as tier;

  return v_event_id;
end;
$$;

revoke all on function public.save_organizer_event_draft(uuid, text, text, text, text, text, timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.save_organizer_event_draft(uuid, text, text, text, text, text, timestamptz, timestamptz, jsonb) to authenticated;
