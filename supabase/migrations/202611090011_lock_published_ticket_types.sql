-- Published ticket categories are immutable from organizer clients.
-- The reservation/payment server functions retain their SECURITY DEFINER access.
drop policy if exists "Approved organizers manage ticket types for their events" on public.ticket_types;
drop policy if exists "Organizers manage ticket types for their events" on public.ticket_types;

create policy "Approved organizers manage ticket types for draft events"
  on public.ticket_types
  for all to authenticated
  using (
    exists (
      select 1
      from public.events e
      join public.profiles p on p.id = e.organizer_id
      where e.id = event_id
        and e.organizer_id = auth.uid()
        and p.role = 'organizer'
        and e.status = 'draft'
    )
  )
  with check (
    exists (
      select 1
      from public.events e
      join public.profiles p on p.id = e.organizer_id
      where e.id = event_id
        and e.organizer_id = auth.uid()
        and p.role = 'organizer'
        and e.status = 'draft'
    )
  );
