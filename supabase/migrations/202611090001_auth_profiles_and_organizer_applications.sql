-- Create a profile automatically for every newly registered account.
-- New accounts always start as customers; organizer access is requested separately.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.organizer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_name text not null check (char_length(organization_name) between 2 and 120),
  activity_type text not null check (char_length(activity_type) between 2 and 80),
  city text not null check (char_length(city) between 2 and 100),
  contact_phone text not null check (char_length(contact_phone) between 6 and 30),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists organizer_applications_user_created_idx
  on public.organizer_applications (user_id, created_at desc);

alter table public.organizer_applications enable row level security;

drop policy if exists "Users can submit organizer applications" on public.organizer_applications;
create policy "Users can submit organizer applications"
  on public.organizer_applications
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'customer'
    )
    and not exists (
      select 1 from public.organizer_applications a
      where a.user_id = auth.uid() and a.status = 'pending'
    )
  );

drop policy if exists "Users can read their organizer applications" on public.organizer_applications;
create policy "Users can read their organizer applications"
  on public.organizer_applications
  for select to authenticated
  using (user_id = auth.uid());

-- No client-side UPDATE policy is intentionally created. Approval and role
-- promotion must be performed by trusted server-side administration only.
