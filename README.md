# AdEarn

AdEarn is a responsive web platform prototype for transparent, partner-funded microtasks.

## Current status

- Real email/password account registration and login are implemented with Supabase Auth.
- Email confirmation and password recovery use the PKCE token-hash callback at `/auth/confirm`.
- Member pages verify the signed-in user server-side and refresh sessions through secure cookies.
- Missions, reward balances, task verification and withdrawals are still demonstrations. No real money is held or paid.
- Do not credit users from browser events. Production rewards must be verified server-side against a partner's documented callback or API, with idempotency, audit logs and a funded reward budget.

## Stack

- Next.js App Router
- React + TypeScript
- Supabase Auth with `@supabase/ssr`
- CSS (no heavy UI framework)

## Supabase setup

**Use a dedicated Supabase project for AdEarn. Do not reuse the Ticket Mada or Erëmīa project.**

1. Create a separate Supabase project for AdEarn.
2. In the project dashboard, open **Connect** and copy the Project URL and **Publishable key**.
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (local: `http://localhost:3000`; production: your public AdEarn URL)
4. In **Authentication → URL Configuration**, set the Site URL to your deployed AdEarn URL and add the callback URL to the Redirect URLs allowlist:
   - `http://localhost:3000/auth/confirm`
   - `https://YOUR-ADEARN-DOMAIN/auth/confirm`
5. Keep email confirmation enabled. In **Authentication → Emails → Templates**, use token-hash links for the two templates:
   - **Confirm signup** link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - **Reset password** link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

The callback validates the token with Supabase, stores the session in secure cookies, and sends recovery requests to the password-update screen.

The publishable key is designed for public clients. Never put a Supabase secret key or service-role key in a `NEXT_PUBLIC_*` variable, browser code, or GitHub.

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
- Add the three environment variables from `.env.example` in the Render dashboard.

Render's free web services sleep after 15 minutes without incoming traffic and can take about a minute to wake up. Render says free instances are for testing and hobby use, not production. Do not store persistent user or financial data on the service filesystem.

## Planned next steps

1. Persistent profile editing and account deletion workflow
2. Server-verified task submissions and reward ledger
3. Partner integration only after confirming that incentivized tasks are explicitly allowed
4. Transparent withdrawal rules and payout operations
5. Security, privacy and operational review before public launch
