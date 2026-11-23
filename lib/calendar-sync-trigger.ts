import "server-only";

import { after } from "next/server";
import { isGoogleCalendarConfigured, syncGoogleCalendar } from "./google-calendar";
import { getRepository } from "./repository";

export async function syncCalendarNow(): Promise<void> {
  if (!isGoogleCalendarConfigured()) return;
  const repository = getRepository();
  const [schedule, wardName] = await Promise.all([repository.getAdminSchedule(), repository.getWardName()]);
  await syncGoogleCalendar(schedule, wardName);
}

async function runSyncSafely(): Promise<void> {
  try {
    await syncCalendarNow();
  } catch (error) {
    console.error("Instant calendar sync failed; nightly maintenance will reconcile", error);
  }
}

// Schedules a Google Calendar reconcile right after the current response is
// sent, so a booking change reaches the calendar within seconds without
// slowing the member's confirmation. Failures never affect the booking; the
// nightly maintenance cron reconciles anything a failed sync missed.
export async function scheduleCalendarSync(): Promise<void> {
  try {
    after(runSyncSafely);
  } catch {
    // Outside a request context (tests, scripts): run inline instead.
    await runSyncSafely();
  }
}
