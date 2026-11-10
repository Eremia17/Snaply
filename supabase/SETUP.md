# Ticket Mada — Supabase setup

The SQL files in `migrations/` are committed to GitHub, but GitHub does not apply them to your Supabase project automatically.

## Apply the migrations

On a fresh Supabase project, apply every SQL migration in this exact filename order. Open **SQL Editor** and execute each file once:

1. `202611080001_initial_ticketing_schema.sql`
2. `202611080002_commission_tracking.sql`
3. `202611080003_protect_organizer_roles.sql`
4. `202611090001_auth_profiles_and_organizer_applications.sql`
5. `202611090002_admin_organizer_review.sql`
6. `202611090003_secure_organizer_review.sql`
7. `202611090004_organizer_draft_delete_policy.sql`
8. `202611090005_atomic_organizer_draft_sync.sql`
9. `202611090006_private_event_posters.sql`
10. `202611090007_secure_event_publication.sql`
11. `202611090008_atomic_ticket_reservations.sql`
12. `202611090009_release_expired_reservations_on_event_changes.sql`
13. `202611090010_protect_ticket_inventory.sql`
14. `202611090011_lock_published_ticket_types.sql`
15. `202611090012_atomic_ticket_check_in.sql`
16. `202611090013_verified_payment_ticket_issuance.sql`
17. `202611100001_organizer_checkin_activity.sql`
18. `202611100002_explicit_data_api_grants.sql`

Migration 018 grants the minimum client roles explicit access to the current public tables. This is required because new Supabase projects no longer automatically grant Data API table privileges by default. All nine application tables have RLS enabled; anonymous clients receive read-only access to published-event catalogue tables, authenticated users are still constrained by RLS, and the server-side service role receives table privileges. When adding future tables, add explicit grants and RLS policies in the same migration.


The second and third migration files both define parts of organizer review and role protection. Run them in order; the later secure review definition is the final one.

If any migrations have already been applied, check the database migration history and current schema first. Do not blindly rerun SQL files or apply them out of order. GitHub commits do not apply migrations to Supabase automatically.

Migration 006 creates a **private** `event-posters` Storage bucket. Upload, read, update and delete policies restrict each organizer to files inside their own user-ID folder. Poster uploads are limited to 5 MiB and JPEG, PNG or WebP. Spectators can read an image only when its exact object path is attached to an event whose status is `published`.

## Organizer QR scanner

The mobile organizer workspace links to `/organizer/scanner`. It uses Expo SDK 57's `expo-camera` `CameraView` with QR-only barcode detection. A scanned token is sent directly to the authenticated `check_in_ticket(p_qr_token)` RPC; the database validates the organizer role, event ownership, ticket state and event status, then marks the ticket used atomically. A second scan is rejected.

The scanner requires an internet connection. It does not cache tickets or support offline check-in yet. The app requests camera permission only when the scanner screen is opened. Install the SDK-matched camera package (`expo-camera ~57.0.6`) and use an Expo Go build that supports SDK 57. The organizer dashboard also links to `/organizer/attendance`, which reads event-level ticket counts and the latest 100 check-ins through the two read-only RPCs in migration 017. Both RPCs verify the authenticated organizer/admin role and restrict organizers to their own events.

## Organizer attendance reports

The `/organizer/attendance` screen calls two authenticated reporting RPCs: `organizer_attendance_stats()` returns per-event paid ticket totals, valid tickets, checked-in tickets and latest check-in time; `organizer_checkin_history()` returns the latest 100 check-ins with only the event name, ticket type, ticket ID and timestamp. Both functions verify the organizer/admin role and restrict organizers to their own events. They do not expose buyer names, emails or phone numbers. Apply migration `202611100001_organizer_checkin_activity.sql` once before opening this screen.

## Secure QR token delivery

The Edge Function `my-ticket-qr` returns a QR payload only after validating the caller's Supabase session, confirming that the requested ticket belongs to that user, and confirming that its order is paid and the ticket is still valid.

Deploy these files as a Supabase Edge Function:

- `supabase/functions/_shared/ticket-qr.ts`
- `supabase/functions/my-ticket-qr/index.ts`

In the Supabase Dashboard, open **Edge Functions → Secrets** and add `TICKET_QR_HMAC_SECRET` with a cryptographically random value of at least 32 characters. Keep it private, do not commit it, and do not put it in any `EXPO_PUBLIC_*` variable. The function also uses the standard server-side `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` environment values.

**Important issuance contract:** QR tokens are deterministic HMAC-SHA256 values derived from the ticket UUID using the shared `createTicketQrToken` helper. The trusted payment webhook must use that exact helper and the same secret when building the `p_tickets` argument for `finalize_verified_order_payment`. The database still stores only SHA-256 hashes. If an older or external issuer generated random tokens, this retrieval endpoint intentionally refuses to return a QR for those tickets; they must be securely reissued by a trusted server flow. Do not change or rotate the HMAC secret after issuing tickets unless a controlled migration/reissue plan is in place.

The mobile data layer exposes `fetchMyTicketQrToken(ticketId)`; it calls the Edge Function with the signed-in user's session. The **Mes billets** screen now renders the returned token as a QR image with `react-native-qrcode-svg`; the raw token is never displayed as ordinary text or written to logs. `react-native-svg` is included in Expo Go for this SDK, while the QR renderer is a JavaScript package.

This endpoint does not process payments or issue tickets. Deploying the function and setting its secret are required before QR retrieval can work.

## Assign the first administrator

There is intentionally no public admin-registration flow. After creating your own account and confirming its email, a trusted project owner must promote that account once from the Supabase SQL Editor.

Replace the email below with the exact email address of the account you control:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('YOUR_ADMIN_EMAIL')
)
and role = 'customer';
```

Check the result:

```sql
select u.email, p.role
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('YOUR_ADMIN_EMAIL');
```

Only a trusted project owner should run this bootstrap query. Never expose a Supabase service-role key in the mobile app, repository, or public client configuration.

## What this enables

- Administrators can read pending organizer applications.
- The app calls `review_organizer_application` to approve or reject an application.
- Approved organizers can save private event drafts and their ticket tiers atomically.
- Organizers can upload and retrieve their own private event posters.
- Organizers can publish a complete future event through a server-side validation function; direct client changes to event visibility are blocked.
- Unpublishing is blocked while pending or paid orders exist, so cancellation and refund handling cannot be bypassed.
- Spectators can temporarily reserve 1–10 tickets per order. Inventory is locked transactionally, and unpaid reservations expire after 15 minutes.
- Expired reservations are released during the next reservation attempt and before an organizer unpublishes an event.
- Reserved and sold inventory counters cannot be edited directly by organizer clients; only trusted transactional server functions can change them.
- Ticket categories become read-only to organizers after publication; organizers must unpublish safely before editing them. No payment is collected and no ticket or QR code is issued by this reservation feature.
- The atomic `check_in_ticket` RPC hashes an opaque QR token, verifies that the authenticated approved organizer owns the event, and changes a valid ticket to used in one transaction. The organizer mobile scanner sends QR payloads to this RPC; repeated scans are rejected. Online check-in only; offline scanning is not implemented.
- Organizer attendance reporting returns per-event totals and the latest 100 check-ins through role-checked RPCs, without exposing buyer contact details.
- The server-only `finalize_verified_order_payment` RPC converts an unexpired reservation into paid inventory, records the verified payment ledger, and issues one valid ticket per reserved place in a single transaction. It accepts only the `service_role`; a trusted Edge Function must first verify the provider's signed callback and amount. The server supplies unique ticket IDs and opaque QR tokens; only token hashes are stored. Never call this RPC from the mobile app, a browser redirect, or an unverified client request.
- No payment provider is connected yet. Provider webhook verification and end-to-end payment-to-ticket issuance remain separate implementation and test tasks. Secure QR delivery and organizer scanning code are present but require deployment/configuration and real-device testing. The fee amount passed to the RPC must come from a verified provider settlement record; no provider fee or commission is assumed.
- Approval changes the applicant's profile role to `organizer` and marks the application reviewed in one database transaction.
- Rejection leaves the applicant as a spectator.
- Non-administrators cannot execute the review function successfully, even if they call it directly.

The app still requires valid Expo public Supabase URL and publishable-key environment variables. Payment processing and ticket issuance are separate features and are not enabled by these migrations.
