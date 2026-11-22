import { afterEach, describe, expect, it, vi } from "vitest";

const { sendEmail, repository, syncGoogleCalendar, calendarConfigured } = vi.hoisted(() => {
  const appointment = { id: "appointment", email: "member@example.test", memberName: "Test Member", phone: "8015550199", isLargeFamily: false, rescheduleToken: "test-token", timeSlotId: "slot", pairedSlotId: null };
  const slot = { id: "slot", dayId: "day", dayDate: "2026-11-29", startTime: "16:00", endTime: "16:10" };
  return {
    sendEmail: vi.fn().mockResolvedValue({ id: "test", transport: "gmail" }),
    repository: {
      createReservation: vi.fn().mockResolvedValue(appointment),
      getDays: vi.fn().mockResolvedValue([{ id: "day", date: slot.dayDate }]),
      getSlotsForDay: vi.fn().mockResolvedValue([slot]),
      getWardName: vi.fn().mockResolvedValue("Test Ward"),
      getAdminPhone: vi.fn().mockResolvedValue("8015550100"),
      getAdminContact: vi.fn().mockResolvedValue({ name: "Colton", email: "secretary@example.test" }),
      getAdminSchedule: vi.fn().mockResolvedValue([]),
    },
    syncGoogleCalendar: vi.fn().mockResolvedValue({ created: 1, updated: 0, deleted: 0, unchanged: 0 }),
    calendarConfigured: { value: true },
  };
});
vi.mock("../lib/email", () => ({ sendEmail }));
vi.mock("../lib/repository", () => ({ getRepository: () => repository }));
vi.mock("../lib/google-calendar", () => ({ isGoogleCalendarConfigured: () => calendarConfigured.value, syncGoogleCalendar }));

import { POST as book } from "../app/api/appointments/route";
import { GET as calendarSync } from "../app/api/cron/calendar-sync/route";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); calendarConfigured.value = true; repository.getAdminContact.mockResolvedValue({ name: "Colton", email: "secretary@example.test" }); });

function bookingRequest() {
  return new Request("https://example.test/api/appointments", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dayId: "day", slotId: "slot", memberName: "Test Member", email: "member@example.test", phone: "8015550199" }),
  });
}

describe("secretary signup notification", () => {
  it("emails the secretary after the member confirmation", async () => {
    const response = await book(bookingRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.secretaryEmailDelivered).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const notice = sendEmail.mock.calls[1][0];
    expect(notice.to).toBe("secretary@example.test");
    expect(notice.replyTo).toBe("member@example.test");
    expect(notice.subject).toContain("new signup");
    expect(notice.text).toContain("Test Member");
    expect(notice.text).toContain("https://tithing-settlement-cal.vercel.app/admin");
  });
  it("sends no notice when no secretary email is saved", async () => {
    repository.getAdminContact.mockResolvedValue({ name: "", email: "" });
    const response = await book(bookingRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.secretaryEmailDelivered).toBeNull();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it("does not double-email when the member is the secretary", async () => {
    repository.getAdminContact.mockResolvedValue({ name: "Colton", email: "member@example.test" });
    const response = await book(bookingRequest());
    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it("still confirms the booking when the secretary notice fails", async () => {
    sendEmail.mockResolvedValueOnce({ id: "test", transport: "gmail" }).mockRejectedValueOnce(new Error("SMTP down"));
    const response = await book(bookingRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.emailDelivered).toBe(true);
    expect(body.secretaryEmailDelivered).toBe(false);
  });
});

describe("calendar sync cron", () => {
  it("rejects requests without the cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    const response = await calendarSync(new Request("https://example.test/api/cron/calendar-sync"));
    expect(response.status).toBe(401);
    expect(syncGoogleCalendar).not.toHaveBeenCalled();
  });
  it("syncs the calendar when authorized", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    const response = await calendarSync(new Request("https://example.test/api/cron/calendar-sync", { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.calendar).toMatchObject({ configured: true, created: 1 });
    expect(syncGoogleCalendar).toHaveBeenCalledTimes(1);
  });
  it("reports cleanly when calendar is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    calendarConfigured.value = false;
    const response = await calendarSync(new Request("https://example.test/api/cron/calendar-sync", { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.calendar.configured).toBe(false);
    expect(syncGoogleCalendar).not.toHaveBeenCalled();
  });
});
