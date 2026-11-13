-- Run this after applying AD EARN CORE SCHEMA.sql in the dedicated AdEarn project.
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
