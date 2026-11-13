# AdEarn

AdEarn is a responsive web platform prototype for transparent, partner-funded microtasks.

## Current implementation

- Responsive public landing page and mission catalogue.
- Supabase email/password registration, sign-in, email confirmation and password recovery flows.
- Protected member area with editable display name.
- Supabase-backed mission catalogue with search/category filters and mission detail pages.
- Authenticated text-based task submissions with duplicate protection and a member submission-history page.
- Wallet and dashboard read from an append-only ledger projection; no balances are fabricated.
- Database-role-gated admin dashboard with audited approve/reject controls for pending submissions.
- Atomic PostgreSQL review function locks each attempt, verifies the admin role and writes an audit-log entry. Review decisions do not create wallet credits.
- Core PostgreSQL schema and read-only verification queries are in `supabase/`.

## Not live yet

- A dedicated AdEarn Supabase project has not been configured or connected.
- The SQL schema has been committed but has **not** been applied to a database.
- No real partner has been approved and no paid mission is seeded.
- Partner event verification and reward-credit automation are not implemented. Admins can approve/reject submissions, but approval does not pay a reward.
- Withdrawal requests and payouts are not activated. No real money is held or paid.

Do not credit users from browser events. Production rewards must be verified server-side against an authorized partner's documented callback or API, with idempotency, audit logs and a funded reward budget.

## Stack

- Next.js App Router
- React + TypeScript
- Supabase Auth, PostgreSQL and Row Level Security
- `@supabase/ssr` and `@supabase/supabase-js`
- CSS (no heavy UI framework)

## Supabase setup

**Use a dedicated Supabase project for AdEarn. Do not reuse the Ticket Mada or Erëmia project.**

1. Create a separate Supabase project for AdEarn.
2. In the project dashboard, open **Connect** and copy the Project URL and **Publishable key**.
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (local: `http://localhost:3000`; production: your public AdEarn URL)
4. In **Authentication → URL Configuration**, set the Site URL to your deployed AdEarn URL and add the callback URL to the Redirect URLs allowlist:
   - `http://localhost:3000/auth/confirm`
   - `https://YOUR-ADEARN-DOMAIN/auth/confirm`
5. Keep email confirmation enabled. In **Authentication → Emails → Templates**, use token-hash links:
   - **Confirm signup**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - **Reset password**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
6. Open the dedicated project's SQL Editor and review/run `supabase/AD EARN CORE SCHEMA.sql`.
7. Run `supabase/VERIFY CORE SCHEMA.sql` and review the RLS policies and grants.
8. To grant your own account administrator access, run this manually in the dedicated project's SQL Editor after replacing the email with your verified account email: `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR-VERIFIED-EMAIL');`. Never add a public role-editing form or let users update this column.
9. Add the Supabase URL and publishable key to the deployment environment.

The callback validates the token with Supabase, stores the session in secure cookies, and sends recovery requests to the password-update screen.

The publishable key is designed for public clients. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable, browser code, or GitHub.

## Local development

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Deployment on Render

Create a **Web Service** connected to this repository:
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Environment: Node
- Add the three public environment variables from `.env.example` in the Render dashboard.

Render's free web services sleep after 15 minutes without incoming traffic and can take about a minute to wake up. Treat the free instance as a preview environment, not a production host for financial records.

## Security boundaries

- Client users cannot publish tasks, approve submissions, insert ledger entries or change withdrawal status.
- Only approved providers with explicit permission for incentivized tasks can back provider-linked public offers.
- A task submission is not an approved reward.
- Ledger entries are immutable. Corrections use reversal entries.
- The service-role/secret key must remain server-side and must never be committed to this repository.

## Next engineering steps

1. Install and verify the schema on a dedicated AdEarn Supabase project.
2. Connect an approved partner and funded reward budget before implementing idempotent reward credits. The admin review workflow currently records approve/reject decisions but intentionally does not pay rewards.
3. Add file uploads only after private Storage buckets and access policies are tested.
4. Integrate partners only after confirming that incentivized tasks are explicitly allowed.
5. Design withdrawals only after confirming a real, funded payout route and its fees/limits.
6. Add automated RLS tests and complete a security/privacy review before launch.


## Admin mission studio

The administrator area includes a mission studio at `/admin/tasks`. It supports creating/editing drafts and pausing or archiving tasks. Publishing is intentionally disabled until a real partner, verified completion method, and funded reward budget are in place. Task changes are recorded in the database audit log.
