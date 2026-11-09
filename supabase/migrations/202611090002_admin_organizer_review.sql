-- Admin review workflow for organizer access.
-- The application role is checked in the database; the client cannot approve itself.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'service_role') then
    if tg_op = 'INSERT' then
      new.role := 'customer';
    elsif new.role is distinct from old.role then
      raise exception 'Account role changes require server-side approval';
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists "Admins can review organizer applications" on public.organizer_applications;
create policy "Admins can review organizer applications"
  on public.organizer_applications
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.review_organizer_application(
  p_application_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Administrator access required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision';
  end if;

  select user_id into v_user_id
  from public.organizer_applications
  where id = p_application_id and status = 'pending'
  for update;

  if v_user_id is null then
    raise exception 'Pending application not found';
  end if;

  update public.organizer_applications
  set status = p_decision, reviewed_at = now()
  where id = p_application_id;

  if p_decision = 'approved' then
    update public.profiles
    set role = 'organizer', updated_at = now()
    where id = v_user_id and role = 'customer';

    if not found then
      raise exception 'Applicant profile is missing or has an unexpected role';
    end if;
  end if;
end;
$$;

revoke all on function public.review_organizer_application(uuid, text) from public;
grant execute on function public.review_organizer_application(uuid, text) to authenticated;
