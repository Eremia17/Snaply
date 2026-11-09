-- Secure administrator review for organizer applications.
-- The caller must already have an administrator role assigned by a trusted operator.

drop policy if exists "Admins can read organizer applications" on public.organizer_applications;
create policy "Admins can read organizer applications"
  on public.organizer_applications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
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
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'Administrator access required';
  end if;

  select a.user_id, a.status
    into v_user_id, v_status
  from public.organizer_applications a
  where a.id = p_application_id
  for update;

  if not found then
    raise exception 'Organizer application not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'This application has already been reviewed';
  end if;

  if p_decision = 'approved' then
    update public.profiles
    set role = 'organizer'
    where id = v_user_id
      and role = 'customer';

    if not found then
      raise exception 'Applicant profile is missing or no longer eligible';
    end if;
  end if;

  update public.organizer_applications
  set status = p_decision,
      reviewed_at = now()
  where id = p_application_id;
end;
$$;

revoke all on function public.review_organizer_application(uuid, text) from public;
revoke all on function public.review_organizer_application(uuid, text) from anon;
grant execute on function public.review_organizer_application(uuid, text) to authenticated;

comment on function public.review_organizer_application(uuid, text)
  is 'Allows authenticated administrators to approve or reject a pending organizer application atomically.';
