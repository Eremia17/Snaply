-- Protect account roles: users must never promote themselves to organizer/admin.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.role := 'customer';
    elsif new.role is distinct from old.role then
      raise exception 'Account role changes require server-side approval';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before insert or update of role on public.profiles
for each row execute function public.protect_profile_role();

-- Event creation and editing require an organizer role granted by trusted server logic.
drop policy if exists "Organizers can create events" on public.events;
create policy "Approved organizers can create events" on public.events
  for insert to authenticated
  with check (
    organizer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
  );

drop policy if exists "Organizers can update their events" on public.events;
create policy "Approved organizers can update their events" on public.events
  for update to authenticated
  using (
    organizer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
  )
  with check (
    organizer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'organizer')
  );

drop policy if exists "Organizers manage ticket types for their events" on public.ticket_types;
create policy "Approved organizers manage ticket types for their events" on public.ticket_types
  for all to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.profiles p on p.id = e.organizer_id
      where e.id = event_id and e.organizer_id = auth.uid() and p.role = 'organizer'
    )
  )
  with check (
    exists (
      select 1 from public.events e
      join public.profiles p on p.id = e.organizer_id
      where e.id = event_id and e.organizer_id = auth.uid() and p.role = 'organizer'
    )
  );
