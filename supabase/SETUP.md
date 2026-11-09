# Ticket Mada — Supabase setup

The SQL files in `migrations/` are committed to GitHub, but GitHub does not apply them to your Supabase project automatically.

## Apply the migrations

1. Open your Supabase project and go to **SQL Editor**.
2. Run the migration files in filename order:
   - `202611090001_auth_profiles_and_organizer_applications.sql`
   - `202611090002_secure_organizer_review.sql`
3. Confirm both queries complete successfully.

If the first migration was already applied, do not run it again manually unless you have checked its idempotency and the current database state. The second migration depends on the profile and application tables from the first.

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
- Approval changes the applicant's profile role to `organizer` and marks the application reviewed in one database transaction.
- Rejection leaves the applicant as a spectator.
- Non-administrators cannot execute the review function successfully, even if they call it directly.

The app still requires valid Expo public Supabase URL and publishable-key environment variables. Payment processing and ticket issuance are separate features and are not enabled by these migrations.
