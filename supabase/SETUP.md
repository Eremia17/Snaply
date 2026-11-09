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

The second and third migration files both define parts of organizer review and role protection. Run them in order; the later secure review definition is the final one.

If any migrations have already been applied, check the database migration history and current schema first. Do not blindly rerun SQL files or apply them out of order. GitHub commits do not apply migrations to Supabase automatically.

Migration 006 creates a **private** `event-posters` Storage bucket. Upload, read, update and delete policies restrict each organizer to files inside their own user-ID folder. Poster uploads are limited to 5 MiB and JPEG, PNG or WebP. Spectators can read an image only when its exact object path is attached to an event whose status is `published`.

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
- Expired reservations are released during the next reservation attempt. No payment is collected and no ticket or QR code is issued by this reservation feature.
- Approval changes the applicant's profile role to `organizer` and marks the application reviewed in one database transaction.
- Rejection leaves the applicant as a spectator.
- Non-administrators cannot execute the review function successfully, even if they call it directly.

The app still requires valid Expo public Supabase URL and publishable-key environment variables. Payment processing and ticket issuance are separate features and are not enabled by these migrations.
