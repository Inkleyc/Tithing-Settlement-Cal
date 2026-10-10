import { todayInAppTimeZone } from "@/lib/dates";
import { isGoogleCalendarConfigured, syncGoogleCalendar } from "@/lib/google-calendar";
import { getRepository } from "@/lib/repository";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || (process.env.NODE_ENV === "production" ? "" : "demo-cron-secret");
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ message: "Unauthorized" }, { status: 401 });
  const repository = getRepository();
  const archived = await repository.archivePastDays(todayInAppTimeZone());
  if (!isGoogleCalendarConfigured()) return Response.json({ ok: true, archived, calendar: { configured: false } });
  try {
    const [schedule, wardName] = await Promise.all([repository.getAdminSchedule(), repository.getWardName()]);
    const calendar = await syncGoogleCalendar(schedule, wardName);
    return Response.json({ ok: true, archived, calendar: { configured: true, ...calendar } });
  } catch (error) {
    console.error("Nightly maintenance calendar sync failed", error);
    return Response.json({ ok: false, archived, calendar: { configured: true, message: error instanceof Error ? error.message : "Calendar sync failed." } }, { status: 207 });
  }
}

