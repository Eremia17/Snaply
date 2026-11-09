-- Allow organizers to remove only their own unpublished draft events.
-- This is also used to roll back an incomplete draft sync if ticket tiers fail.
drop policy if exists "Organizers can delete their own draft events" on public.events;
create policy "Organizers can delete their own draft events"
  on public.events
  for delete to authenticated
  using (
    organizer_id = auth.uid()
    and status = 'draft'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'organizer'
    )
  );
