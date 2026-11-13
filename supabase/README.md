# AdEarn database setup

This folder contains the AdEarn core schema installed in Supabase project `ebkyueqhiqqkfejmziwl` (region `eu-west-1`). The project was repurposed from Ticket Mada; its dashboard display name may still show the old name.

## Apply it safely

1. The schema has already been applied directly to the repurposed project. Do not create a second project.
2. Open the AdEarn project's SQL Editor and run `VERIFY CORE SCHEMA.sql`.
3. Confirm these tables exist: `profiles`, `wallets`, `ad_providers`, `tasks`, `task_attempts`, `transactions`, `withdrawals`, and `admin_logs`.
4. Register your account after Render environment variables and Auth redirect URLs are configured. Confirm that the Auth trigger creates one profile and one empty wallet.
5. Verify RLS is enabled on every table with this query:

```sql
select schemaname, tablename, rowsecurity
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in ('profiles','wallets','ad_providers','tasks','task_attempts','transactions','withdrawals','admin_logs')
order by tablename;
```

## Security model

- `profiles.role` is server-managed. Editable Auth metadata is never used for authorization.
- Visitors and members can only read published tasks. Administrators can create and edit drafts and pause/archive existing tasks through server actions protected again by database RLS. Publishing is deliberately disabled until a real approved partner and funded reward budget are verified.
- Provider-backed tasks are visible only when the provider is active and explicitly approved for incentivized tasks.
- Members can submit one attempt per task and read only their own submissions.
- Attempt review and status changes are performed by the `public.admin_review_task_attempt` database function. It checks `auth.uid()` against `profiles.role`, locks the attempt row, updates the review fields and writes an audit log in one transaction.
- The review function can only be executed by authenticated sessions, rejects non-admin callers, and does not create wallet transactions. Approval means the submission is accepted, not that a reward has been funded or paid.
- The financial ledger is append-only. Corrections are new reversal entries, never updates or deletes.
- Wallet balances are computed from ledger entries; no demo funds are seeded.
- Withdrawal records are read-only to members. Balance checks, requests, approvals and payout updates require a trusted server workflow.
- `admin_logs` is readable only by database-authorized administrators. Submission reviews and task create/update operations are recorded. The admin audit page at `/admin/logs` exposes the latest 100 entries read-only. by database workflows.
- Never put a Supabase secret/service-role key in a browser bundle, `NEXT_PUBLIC_*` variable, or Git repository.

## Important implementation boundary

This schema creates the data model and database access controls. It does **not** activate real paid missions, verify partner events, approve submissions, or send withdrawals. Those require trusted server endpoints, an authorized partner integration, idempotent event processing, operational review and a funded reward budget.

The first release intentionally has no fake provider rows, fake tasks, sample transactions, or seeded wallet balances.

## Admin account setup

After creating and verifying your own account, grant the administrator role manually from the dedicated project's SQL Editor using the verified account email:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'YOUR-VERIFIED-EMAIL'
);
```

Never expose this role update in the application. Then sign out and sign back in before opening `/admin`.

## Admin review workflow

The admin page offers **Approve** and **Reject** actions for submitted attempts. Each decision is validated and committed atomically by the database function, with an audit-log entry. Repeated decisions are rejected. Approval does not issue a reward credit. Reward credits remain disabled until a real partner, verifiable completion signal and funded budget exist.

## Admin mission studio

The route `/admin/tasks` allows an administrator to create and edit draft missions, pause a mission, or archive it. Draft creation is restricted by an RLS policy that checks the database-managed administrator role. A private audit trigger records task creation and changes in `admin_logs`.

There is intentionally no Publish button. The reward amount and currency on a draft are planning metadata only; they are not a payable balance or a promise of payment. Publishing must remain disabled until an actual incentivized-task partner is approved, its terms are verified, and a reward budget and completion-verification workflow exist.

After updating the schema, run the additional checks 14 and 15 in `VERIFY CORE SCHEMA.sql`.
