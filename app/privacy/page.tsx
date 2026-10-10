import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Tithing Settlement Scheduler</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Privacy policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated October 9, 2026</p>

        <div className="mt-8 space-y-7 leading-7">
          <section>
            <h2 className="text-xl font-semibold text-slate-950">Information we collect</h2>
            <p className="mt-2">When you schedule an appointment, we collect the name, email address, phone number, family-size selection, and appointment time you provide.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-950">How information is used</h2>
            <p className="mt-2">Information is used only to schedule and administer tithing declaration appointments, send confirmations and reminders, support rescheduling or cancellation, maintain attendance records, and place appointment information on an authorized ward administrator&apos;s Google Calendar.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-950">Storage and sharing</h2>
            <p className="mt-2">Appointment information is stored in the scheduler&apos;s secured database and is available to authorized ward administrators. Calendar event details are sent to Google Calendar only when the administrator enables calendar synchronization. Email delivery providers receive the information required to deliver appointment messages. We do not sell personal information or use it for advertising.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-950">Google user data</h2>
            <p className="mt-2">Google Calendar access is used only to read and manage tithing declaration events on the calendar selected by the administrator. The application does not use Google Calendar data for advertising and does not transfer it except as necessary to provide calendar synchronization, comply with law, or protect against abuse.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-950">Retention and choices</h2>
            <p className="mt-2">Past appointment records may be retained for ward administrative purposes. Members may use their secure appointment link or contact the ward administrator to correct or cancel an appointment. A Google account holder can revoke the application&apos;s access from their Google Account permissions at any time.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-950">Contact</h2>
            <p className="mt-2">Questions or requests concerning appointment information should be directed to the ward administrator using the contact information shown in the scheduler.</p>
          </section>
        </div>

        <Link href="/" className="mt-10 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white">Return to scheduling</Link>
      </div>
    </main>
  );
}
