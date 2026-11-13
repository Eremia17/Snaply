-- AdEarn administrator-managed partner registry.
-- New providers remain pending and cannot run rewarded tasks until verified.

alter table public.ad_providers
  add column if not exists verification_url text
    check (verification_url is null or verification_url ~ '^https://'),
  drop column if exists admin_notes;

grant insert, update on public.ad_providers to authenticated;

drop policy if exists providers_insert_admin_pending on public.ad_providers;
create policy providers_insert_admin_pending on public.ad_providers
for insert to authenticated
with check (
  (select private.is_admin())
  and status = 'pending'
  and incentivized_tasks_allowed = false
);

drop policy if exists providers_update_admin_reviewed on public.ad_providers;
create policy providers_update_admin_reviewed on public.ad_providers
for update to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and (
    (status = 'active' and incentivized_tasks_allowed = true and verification_url is not null)
    or (status in ('pending', 'paused', 'disabled') and incentivized_tasks_allowed = false)
  )
);

create or replace function private.log_admin_provider_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid;
begin
  actor := (select auth.uid());
  if tg_op = 'INSERT' then
    insert into public.admin_logs(actor_id, action, entity_type, entity_id, details)
    values (actor, 'provider_created_pending', 'ad_provider', new.id,
      pg_catalog.jsonb_build_object('name', new.name, 'status', new.status));
    return new;
  end if;
  insert into public.admin_logs(actor_id, action, entity_type, entity_id, details)
  values (actor, 'provider_updated', 'ad_provider', new.id,
    pg_catalog.jsonb_build_object(
      'before', pg_catalog.jsonb_build_object('name', old.name, 'status', old.status),
      'after', pg_catalog.jsonb_build_object('name', new.name, 'status', new.status,
        'incentivized_tasks_allowed', new.incentivized_tasks_allowed,
        'verification_url', new.verification_url)
    ));
  return new;
end;
$$;

revoke all on function private.log_admin_provider_change() from public, anon, authenticated;
drop trigger if exists ad_providers_admin_audit on public.ad_providers;
create trigger ad_providers_admin_audit
after insert or update on public.ad_providers
for each row execute function private.log_admin_provider_change();
