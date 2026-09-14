# Ward Tithing Declaration Web App — Reference Architecture

## 1. Product overview
A single-purpose web app for a ward executive secretary to manage annual tithing declaration appointments. The product is intentionally lightweight and designed for a Vercel + Supabase deployment, but the initial implementation is built with mock services so it runs locally without third-party credentials.

## 2. Business requirements
- Public sign-up flow for active declaration dates and 10-minute slots.
- Reserved slots remain hidden from public view beyond their "Reserved" state.
- Rescheduling only through a secure tokenized link; no self-cancellation.
- Admin dashboard guarded by a single password and session cookie.
- Generate recurring slot blocks and buffers for declaration days.
- Printable roster for use as a foyer backup.
- Reminder emails through Resend and quick mobile SMS deep-links.
- Daily cron endpoint for day-before reminders.

## 3. Stack
- Next.js App Router + TypeScript + Tailwind CSS + Lucide React
- Supabase PostgreSQL for persistent data
- Resend for transactional emails
- Vercel Cron for scheduled reminders

## 4. Database schema
### days
- id: UUID PK default gen_random_uuid()
- date: DATE NOT NULL UNIQUE
- is_active: BOOLEAN NOT NULL DEFAULT true
- notes: VARCHAR(255) NULL

### time_slots
- id: UUID PK default gen_random_uuid()
- day_id: UUID reference to days.id ON DELETE CASCADE
- start_time: TIME NOT NULL
- end_time: TIME NOT NULL
- is_buffer: BOOLEAN NOT NULL DEFAULT false
- is_blocked: BOOLEAN NOT NULL DEFAULT false
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- UNIQUE(day_id, start_time)

### appointments
- id: UUID PK default gen_random_uuid()
- time_slot_id: UUID UNIQUE reference to time_slots.id
- member_name: VARCHAR(150) NOT NULL
- email: VARCHAR(255) NOT NULL
- phone: VARCHAR(25) NOT NULL
- is_large_family: BOOLEAN NOT NULL DEFAULT false
- reschedule_token: UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()
- status: VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled'))
- reminder_email_sent: BOOLEAN NOT NULL DEFAULT false
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()

## 5. Feature flows
### Public booking page
- Show active dates.
- Display slot grid with open, reserved, and buffer states.
- Open a booking modal with name, email, cell phone, and large-family option.
- Validate that the selected slot is available and that the next slot is open when double block is requested.
- Create confirmation email and show a success message with Bishop's Office details.

### Reschedule page
- Read the reschedule token from the query string.
- Show the current appointment details.
- Display available slots across active days.
- Reassign the appointment to the new slot while freeing the original slot.
- Provide a clear admin phone notice instead of a cancellation control.

### Admin dashboard
- Protect access with ADMIN_PASSWORD plus an HTTP-only cookie session.
- Add dates and auto-generate slots with buffer periods.
- Toggle a slot between open and blocked.
- Add walk-ins manually.
- Cancel appointments and release the slot.
- Show daily roster suitable for print.
- Add SMS reminder link anchors using sms: URI.

### Automated reminder cron
- Route: /api/cron/reminders
- Protect with Authorization: Bearer ${CRON_SECRET}
- Run daily at 08:00 Mountain Time via Vercel Cron
- Find confirmed appointments scheduled for tomorrow with reminder_email_sent = false
- Send reminder emails and update the reminder flag

## 6. Incremental build plan
### Phase 1: Local mock-first build
- Set up the app shell and core routes.
- Add a mock repository/service layer that emulates database reads and writes.
- Seed sample dates/slots in memory.
- Build public booking flow and reschedule flow.
- Build admin dashboard locally with a demo password.
- Use console logging for email instead of a live Resend client.

### Phase 2: Supabase integration
- Create SQL migration for days, time_slots, and appointments.
- Replace mock repository with Supabase client service.
- Add row-level or server-side validation to protect against double booking.

### Phase 3: Email + cron integration
- Add Resend API client.
- Add cron route for reminders.
- Add Vercel configuration and env documentation.

## 7. Local mock implementation conventions
- Default admin password in local mock: demo-admin
- Mock repository functions should mirror the final service contract.
- Console logging is used as a stand-in for the transactional email service.
- Seeded sample data should be visible immediately after `npm run dev` without third-party credentials.

## 8. Required environment variables
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- ADMIN_PASSWORD
- CRON_SECRET

## 9. Deployment notes
When live credentials are available, place the values in the project environment file and Vercel environment settings in the same names shown above. Until then, keep the mock mode active by using the demo defaults in the local development app.
