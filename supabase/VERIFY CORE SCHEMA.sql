-- Run this against the repurposed AdEarn Supabase project (ref: ebkyueqhiqqkfejmziwl).
-- These queries are read-only and do not modify data.

-- 1) Every AdEarn public table must have RLS enabled.
select
  tablename,
  rowsecurity as rls_enabled
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'wallets', 'ad_providers', 'tasks',
    'task_attempts', 'transactions', 'withdrawals', 'admin_logs'
  )
order by tablename;

-- 2) Review policies and the roles/operations they cover.
select
  tablename,
  policyname,
  roles,
  cmd
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'wallets', 'ad_providers', 'tasks',
    'task_attempts', 'transactions', 'withdrawals', 'admin_logs'
  )
order by tablename, cmd, policyname;

-- 3) Confirm client grants are deliberately narrow.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'profiles', 'wallets', 'ad_providers', 'tasks',
    'task_attempts', 'transactions', 'withdrawals', 'admin_logs'
  )
order by table_name, grantee, privilege_type;

-- 4) Review the private trigger/ledger functions.
select
  namespace.nspname as schema_name,
  procedure.proname as function_name,
  procedure.prosecdef as security_definer,
  procedure.proconfig as function_settings
from pg_catalog.pg_proc as procedure
join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'private'
  and procedure.proname in ('set_updated_at', 'handle_new_user', 'prevent_ledger_mutation')
order by procedure.proname;

-- 5) Confirm the wallet view is configured as security_invoker.
select
  view_class.relname as view_name,
  view_class.reloptions
from pg_catalog.pg_class as view_class
join pg_catalog.pg_namespace as namespace on namespace.oid = view_class.relnamespace
where namespace.nspname = 'public'
  and view_class.relname = 'wallet_balances'
  and view_class.relkind = 'v';

-- 6) Client roles must not be able to insert financial ledger entries.
select
  pg_catalog.has_table_privilege('anon', 'public.transactions', 'INSERT') as anon_can_insert_ledger,
  pg_catalog.has_table_privilege('authenticated', 'public.transactions', 'INSERT') as member_can_insert_ledger;

-- 7) Members may submit only the three intended task-attempt columns.
select
  pg_catalog.has_column_privilege('authenticated', 'public.task_attempts', 'task_id', 'INSERT') as can_set_task_id,
  pg_catalog.has_column_privilege('authenticated', 'public.task_attempts', 'user_id', 'INSERT') as can_set_user_id,
  pg_catalog.has_column_privilege('authenticated', 'public.task_attempts', 'submission_data', 'INSERT') as can_set_submission,
  pg_catalog.has_column_privilege('authenticated', 'public.task_attempts', 'status', 'INSERT') as can_set_review_status;


-- 8) Admin access must be database-managed, never client-editable.
select
  pg_catalog.has_function_privilege('authenticated', 'private.is_admin()', 'EXECUTE') as authenticated_can_check_admin,
  pg_catalog.has_function_privilege('anon', 'private.is_admin()', 'EXECUTE') as anonymous_can_check_admin,
  pg_catalog.has_schema_privilege('authenticated', 'private', 'USAGE') as authenticated_can_resolve_private_schema;

-- 9) Confirm every admin read policy is present.
select
  tablename,
  policyname,
  cmd
from pg_catalog.pg_policies
where schemaname = 'public'
  and policyname in (
    'profiles_select_own_or_admin', 'wallets_select_own_or_admin',
    'providers_select_public', 'providers_select_authenticated',
    'tasks_select_public', 'tasks_select_authenticated',
    'task_attempts_select_own_or_admin', 'transactions_select_own_or_admin',
    'withdrawals_select_own_or_admin', 'admin_logs_select_admin'
  )
order by tablename;

-- 10) The client must not have permission to change the protected role column.
select
  pg_catalog.has_column_privilege(
    'authenticated', 'public.profiles', 'role', 'UPDATE'
  ) as authenticated_can_change_role;


-- 11) Admin review RPC: only authenticated sessions may invoke it.
select
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.admin_review_task_attempt(uuid,text,text)',
    'EXECUTE'
  ) as authenticated_can_review,
  pg_catalog.has_function_privilege(
    'anon',
    'public.admin_review_task_attempt(uuid,text,text)',
    'EXECUTE'
  ) as anonymous_can_review;

-- 12) The review function must pin its search_path.
select
  procedure.proname,
  procedure.proconfig
from pg_catalog.pg_proc as procedure
join pg_catalog.pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname = 'admin_review_task_attempt';

-- 13) Review RPC must never write to the financial ledger.
-- Inspect the function definition and confirm it updates task_attempts
-- and inserts admin_logs only. It must not insert into transactions.
select pg_catalog.pg_get_functiondef(
  'public.admin_review_task_attempt(uuid,text,text)'::regprocedure
) as admin_review_function_definition;


-- 14) Admin mission studio: only admins can create drafts and manage task status.
select
  pg_catalog.has_table_privilege('authenticated', 'public.tasks', 'INSERT') as authenticated_has_task_insert,
  pg_catalog.has_table_privilege('authenticated', 'public.tasks', 'UPDATE') as authenticated_has_task_update;

select tablename, policyname, cmd, roles
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename = 'tasks'
  and policyname in ('tasks_insert_admin_draft', 'tasks_update_admin_managed')
order by policyname;

-- 15) Audit trigger must exist and its helper must remain in the private schema.
select
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'tasks'
  and trigger_name = 'tasks_admin_audit';

select
  namespace.nspname as schema_name,
  procedure.proname as function_name,
  procedure.prosecdef as security_definer,
  procedure.proconfig as function_settings
from pg_catalog.pg_proc as procedure
join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'private'
  and procedure.proname = 'log_admin_task_change';


-- 16) The review RPC must be SECURITY INVOKER, with writes restricted by RLS.
select
  procedure.proname,
  procedure.prosecdef as is_security_definer,
  procedure.proconfig
from pg_catalog.pg_proc as procedure
join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname = 'admin_review_task_attempt';

select
  pg_catalog.has_column_privilege('authenticated', 'public.task_attempts', 'status', 'UPDATE') as admin_review_status_column_granted,
  pg_catalog.has_table_privilege('authenticated', 'public.admin_logs', 'INSERT') as admin_log_insert_granted;

select tablename, policyname, cmd, roles
from pg_catalog.pg_policies
where schemaname = 'public'
  and policyname in ('attempts_update_admin', 'admin_logs_insert_admin')
order by tablename, policyname;


-- 17) Confirm public catalogue policies are restricted to published tasks
-- and active providers, while members see only their own private records.
select tablename, policyname, cmd, roles, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('tasks', 'ad_providers', 'task_attempts', 'transactions', 'withdrawals')
order by tablename, policyname;

-- 18) The signup trigger must provision a profile and an empty wallet.
select
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
  and trigger_name = 'on_auth_user_created_adearn';

-- 19) Confirm the private asset bucket is not public.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'adearn-assets';

-- 20) Check that no legacy Ticket Mada business tables remain.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name in (
    'events', 'orders', 'order_items', 'tickets', 'ticket_types',
    'payment_records', 'organizer_applications', 'organizer_commission_terms'
  );
