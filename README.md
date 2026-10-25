# Ward Tithing Declaration Scheduler

Public booking, secure rescheduling, administrator scheduling, printable rosters, SMS links, and day-before reminders.

Past declaration days are automatically archived without deleting their appointments. The admin Archive tab retains the roster. When Google Calendar credentials are configured, the admin can run an immediate one-way sync and a nightly maintenance job reconciles upcoming confirmed appointments. The app tags its calendar events with the appointment ID, updates changed events, removes future app-managed events whose bookings were cancelled, and never edits unrelated calendar events.

## Repository modes

All route handlers use one server-only repository contract. When both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, the app automatically uses Supabase. If either is absent, it uses the shared in-memory mock repository, which is seeded at server startup and resets when the server restarts. Never expose the service-role key through a `NEXT_PUBLIC_` variable.

Email selects Gmail SMTP when both `GMAIL_USER` and `GMAIL_APP_PASSWORD` are present. Otherwise it selects Resend when both Resend variables are present, then falls back to the server console. Gmail credentials take precedence when both transports are configured.

## Local development

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. For mock mode, remove or leave blank the Supabase variables. Set `ADMIN_PASSWORD`, `SESSION_SECRET`, and `CRON_SECRET`; local demo defaults are not enabled in production.
4. Run `npm run dev` and open `http://localhost:3000`.

Before deployment, run:

```text
npm test
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

With `.env.local` configured and a local server running on port 3010, `npm run test:live` performs an isolated end-to-end acceptance test against Supabase and removes its test records afterward. Set `APP_URL` to test another local origin.

## Supabase setup

Create a Supabase project, then run `supabase/migrations/001_initial_schema.sql` in its SQL editor or through the Supabase CLI. The migration creates the tables, row-level security, and server-only transactional functions. Booking and rescheduling lock the affected rows inside PostgreSQL, including a large-family paired slot, so concurrent requests cannot double-book them. The service-role client is used only on the server; no public database policies are required.

For a database created from an earlier version of this pre-production migration, recreate it or apply the equivalent constraint and function changes before enabling traffic.

## Vercel deployment

Configure:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD` and a separate random `SESSION_SECRET` of at least 32 characters
- `CRON_SECRET`
- `GMAIL_USER` and a Google app-specific `GMAIL_APP_PASSWORD` (no custom domain required)
- `RESEND_API_KEY` and a verified-sender `RESEND_FROM_EMAIL`
- `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, and `GOOGLE_CALENDAR_REFRESH_TOKEN` from a Google OAuth web application granted offline Calendar access
- `GOOGLE_CALENDAR_ID` set to `primary` or the ID of a dedicated calendar

Member-facing links use the stable public origin in `lib/public-links.ts`: `https://tithing-settlement-cal.vercel.app`. Confirmation, reschedule, reminder, cancellation, QR, PDF, and copied sharing links all use this shared setting. `NEXT_PUBLIC_APP_URL`, incoming request hosts, and Vercel deployment URLs do not override it. If the public domain changes, update this setting and redeploy. Test outgoing links from a signed-out browser; keep the production domain publicly accessible in Vercel Deployment Protection. Preview deployments also generate links to the public production app, so use test recipients only when testing emails.

Apply the migration before deploying. `vercel.json` invokes `/api/cron/reminders`; Vercel cron schedules use UTC. `14:00 UTC` is 08:00 Mountain Daylight Time, while exact 08:00 Mountain Standard Time requires `15:00 UTC`. Cron requests must carry `Authorization: Bearer $CRON_SECRET`.

The maintenance cron runs at `08:00 UTC` (01:00 MST / 02:00 MDT). It archives prior dates and runs calendar sync. Google authorization must use the `https://www.googleapis.com/auth/calendar.events` scope and request offline access so a refresh token is issued. Keep the refresh token only in server-side environment variables. If the OAuth consent screen remains in Testing for an external app, Google may expire the refresh token after seven days; publish the app for stable nightly access.

Public schedule responses contain reservation state but no member details. Appointment details require the unguessable reschedule token, and administrative data and mutations require the signed, HTTP-only admin session cookie.

## Gmail delivery without a domain

Use a dedicated ward Gmail account. Enable Google 2-Step Verification, create an app password named `Tithing Scheduler`, and configure the Gmail variables locally and in Vercel. Never use the account's normal password or commit the app password. Confirmation and reminder messages include the ward, date, full appointment range, Bishop's Office, Executive Secretary phone, and secure reschedule link. If a confirmation email fails after a reservation is stored, the UI still confirms the booking and tells the member to save the displayed reschedule link; failed reminders remain eligible for a later retry.

## Executive Secretary contact settings

Apply `supabase/migrations/005_admin_contact.sql` in Supabase SQL Editor to enable the shared name and email settings in Admin → Setup. This additive migration preserves existing records. Until applied, existing settings and booking continue to work; saving new contact details shows a migration-needed message. The saved name personalizes text-reminder drafts, with the generic title as a fallback. The contact email sets Reply-To for Gmail and Resend messages; sending credentials and sender addresses are unchanged. Blank contact email retains the sender's default reply address.
