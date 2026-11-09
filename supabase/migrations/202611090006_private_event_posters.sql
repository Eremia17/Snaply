-- Private poster storage. Each organizer can access only objects under their own UUID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-posters',
  'event-posters',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Organizers upload their own event posters"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Organizers read their own event posters"
on storage.objects for select to authenticated
using (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Organizers update their own event posters"
on storage.objects for update to authenticated
using (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Organizers delete their own event posters"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
