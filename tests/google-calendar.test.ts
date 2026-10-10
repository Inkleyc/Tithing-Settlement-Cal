import { afterEach, describe, expect, it, vi } from "vitest";
import { syncGoogleCalendar } from "../lib/google-calendar";
import type { AdminSchedule } from "../lib/repository";

const originalFetch = global.fetch;
const originalEnv = {
  clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  refreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
  calendarId: process.env.GOOGLE_CALENDAR_ID,
};

afterEach(() => {
  global.fetch = originalFetch;
  process.env.GOOGLE_CALENDAR_CLIENT_ID = originalEnv.clientId;
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = originalEnv.clientSecret;
  process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = originalEnv.refreshToken;
  process.env.GOOGLE_CALENDAR_ID = originalEnv.calendarId;
  vi.restoreAllMocks();
});

const schedule: AdminSchedule = [{
  day: { id: "day-1", date: "2099-11-21", isActive: true, notes: "" },
  slots: [{
    id: "slot-1", dayId: "day-1", startTime: "09:00", endTime: "09:10", isBuffer: false, isBlocked: false, isReserved: true, createdAt: "2099-01-01T00:00:00Z",
    appointment: { id: "appt-1", timeSlotId: "slot-1", pairedSlotId: null, memberName: "Calendar Test", email: "calendar@example.com", phone: "8015550100", isLargeFamily: false, rescheduleToken: "token", status: "confirmed", reminderEmailSent: false, createdAt: "2099-01-01T00:00:00Z", updatedAt: "2099-01-01T00:00:00Z" },
  }],
}];

describe("Google Calendar sync", () => {
  it("creates a tagged event when an appointment is missing", async () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "client";
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "secret";
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = "refresh";
    process.env.GOOGLE_CALENDAR_ID = "primary";
    const responses = [
      new Response(JSON.stringify({ access_token: "access" })),
      new Response(JSON.stringify({ items: [] })),
      new Response(JSON.stringify({ items: [] })),
      new Response(JSON.stringify({ id: "event-1" })),
    ];
    const mockedFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input; void init;
      return responses.shift()!;
    });
    global.fetch = mockedFetch;

    await expect(syncGoogleCalendar(schedule, "Example Ward")).resolves.toEqual({ created: 1, updated: 0, deleted: 0, unchanged: 0 });
    const insert = mockedFetch.mock.calls[3];
    const payload = JSON.parse(String((insert[1] as RequestInit).body));
    expect(payload.extendedProperties.private).toEqual({ source: "tithing-settlement", appointmentId: "appt-1" });
    expect(payload.start).toEqual({ dateTime: "2099-11-21T09:00:00", timeZone: "America/Denver" });
  });
});

