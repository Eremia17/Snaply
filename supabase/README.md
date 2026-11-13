# AdEarn database setup

This folder contains the proposed core schema for a **separate AdEarn Supabase project**.

## Apply it safely

1. Create a dedicated Supabase project for AdEarn. Do not use the Supabase project for Ticket Mada or Erëmia.
2. Open that AdEarn project's SQL Editor.
3. Review and run `AD EARN CORE SCHEMA.sql`.
4. Confirm these tables exist: `profiles`, `wallets`, `ad_providers`, `tasks`, `task_attempts`, `transactions`, `withdrawals`, and `admin_logs`.
5. Run the read-only checks in `VERIFY CORE SCHEMA.sql` and review RLS, grants, triggers and the wallet view.
6. Register a test account through AdEarn after its environment variables are configured. Confirm that the Auth trigger creates one profile and one empty wallet.
7. Verify RLS is enabled on every table with this query:

```sql
select schemaname, tablename, rowsecurity
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in ('profiles','wallets','ad_providers','tasks','task_attempts','transactions','withdrawals','admin_logs')
order by tablename;
```

## Security model

- `profiles.role` is server-managed. Editable Auth metadata is never used for authorization.
- Tasks are read-only to visitors and members. Only trusted server-side administration can publish or edit tasks.
- Provider-backed tasks are visible only when the provider is active and explicitly approved for incentivized tasks.
- Members can submit one attempt per task and read only their own submissions.
- Attempt review and status changes are server-side only.
- The financial ledger is append-only. Corrections are new reversal entries, never updates or deletes.
- Wallet balances are computed from ledger entries; no demo funds are seeded.
- Withdrawal records are read-only to members. Balance checks, requests, approvals and payout updates require a trusted server workflow.
- `admin_logs` is private to trusted server operations.
- Never put a Supabase secret/service-role key in a browser bundle, `NEXT_PUBLIC_*` variable, or Git repository.

## Important implementation boundary

This schema creates the data model and database access controls. It does **not** activate real paid missions, verify partner events, approve submissions, or send withdrawals. Those require trusted server endpoints, an authorized partner integration, idempotent event processing, operational review and a funded reward budget.

The first release intentionally has no fake provider rows, fake tasks, sample transactions, or seeded wallet balances.