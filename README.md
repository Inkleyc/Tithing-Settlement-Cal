# Ward Tithing Declaration Scheduler

Public booking, secure rescheduling, administrator scheduling, printable rosters, SMS links, and day-before reminders.

## Repository modes

All route handlers use one server-only repository contract. When both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, the app automatically uses Supabase. If either is absent, it uses the shared in-memory mock repository, which is seeded at server startup and resets when the server restarts. Never expose the service-role key through a `NEXT_PUBLIC_` variable.

Email selects Resend only when both `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are present; otherwise messages are logged to the server console.

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

## Supabase setup

Create a Supabase project, then run `supabase/migrations/001_initial_schema.sql` in its SQL editor or through the Supabase CLI. The migration creates the tables, row-level security, and server-only transactional functions. Booking and rescheduling lock the affected rows inside PostgreSQL, including a large-family paired slot, so concurrent requests cannot double-book them. The service-role client is used only on the server; no public database policies are required.

For a database created from an earlier version of this pre-production migration, recreate it or apply the equivalent constraint and function changes before enabling traffic.

## Vercel deployment

Configure:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD` and a separate random `SESSION_SECRET` of at least 32 characters
- `CRON_SECRET`
- `RESEND_API_KEY` and a verified-sender `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL` with the deployed HTTPS origin

Apply the migration before deploying. `vercel.json` invokes `/api/cron/reminders`; Vercel cron schedules use UTC. `14:00 UTC` is 08:00 Mountain Daylight Time, while exact 08:00 Mountain Standard Time requires `15:00 UTC`. Cron requests must carry `Authorization: Bearer $CRON_SECRET`.

Public schedule responses contain reservation state but no member details. Appointment details require the unguessable reschedule token, and administrative data and mutations require the signed, HTTP-only admin session cookie.
