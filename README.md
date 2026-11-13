# AdEarn

AdEarn is a responsive web platform prototype for transparent, partner-funded microtasks.

## Current status

This first commit is a frontend foundation and visual prototype only:
- No real user accounts yet
- No real money or wallet balance
- No ad network integration
- No payout processing
- Demo task cards are illustrative and are not paid offers

Never credit a user based only on a browser event or a client-side value. Production rewards must be verified server-side against a partner's documented callback or API, with idempotency, audit logs, and a funded reward budget.

## Stack

- Next.js App Router
- React + TypeScript
- CSS (no heavy UI framework)
- Supabase will be added after the interface and data model are reviewed

## Local development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deployment on Render

Create a **Web Service** connected to this repository:
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Environment: Node

Render's free web services sleep after 15 minutes without incoming traffic and can take about a minute to wake up. Render says free instances are for testing and hobby use, not production. Do not store persistent user or financial data on the service filesystem.

## Planned next steps

1. Supabase schema, authentication and row-level security
2. Server-verified task submissions and reward ledger
3. Partner integration only after confirming that incentivized tasks are explicitly allowed
4. Transparent withdrawal rules and payout operations
5. Security, privacy and operational review before public launch
