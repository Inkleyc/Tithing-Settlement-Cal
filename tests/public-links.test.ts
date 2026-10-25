import { afterEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_APP_URL, rescheduleUrl } from "../lib/public-links";

const { sendEmail, repository } = vi.hoisted(() => {
  const appointment = { id: "appointment", email: "test@example.test", memberName: "Test", rescheduleToken: "test-token", timeSlotId: "slot", pairedSlotId: null };
  const slot = { id: "slot", dayId: "day", dayDate: "2026-11-29", startTime: "16:00", endTime: "16:10" };
  return {
    sendEmail: vi.fn().mockResolvedValue({ id: "test", transport: "gmail" }),
    repository: {
      createReservation: vi.fn().mockResolvedValue(appointment),
      rescheduleAppointment: vi.fn().mockResolvedValue(appointment),
      cancelAppointment: vi.fn().mockResolvedValue(appointment),
      getAppointmentByToken: vi.fn().mockResolvedValue(appointment),
      getAppointmentSlot: vi.fn().mockResolvedValue(slot),
      getDays: vi.fn().mockResolvedValue([{ id: "day", date: slot.dayDate }]),
      getSlotsForDay: vi.fn().mockResolvedValue([slot]),
      getAllPublicSlots: vi.fn().mockResolvedValue([]),
      getWardName: vi.fn().mockResolvedValue("Test Ward"),
      getAdminPhone: vi.fn().mockResolvedValue("8015550100"),
      getAppointmentsForDate: vi.fn().mockResolvedValue([appointment]),
      markReminderSent: vi.fn().mockResolvedValue(undefined),
      archivePastDays: vi.fn().mockResolvedValue(0),
      getAdminSchedule: vi.fn().mockResolvedValue([]),
      getArchivedSchedule: vi.fn().mockResolvedValue([]),
    },
  };
});
vi.mock("../lib/email", () => ({ sendEmail }));
vi.mock("../lib/repository", () => ({ getRepository: () => repository }));
vi.mock("../lib/authorization", () => ({ requireAdmin: vi.fn() }));
vi.mock("../lib/google-calendar", () => ({ isGoogleCalendarConfigured: () => false, syncGoogleCalendar: vi.fn() }));

import { POST as book } from "../app/api/appointments/route";
import { PATCH as reschedule } from "../app/api/reschedule/route";
import { GET as remind } from "../app/api/cron/reminders/route";
import { POST as adminAction } from "../app/api/admin/schedule/route";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

function request(path: string, body: object, method = "POST") {
  return new Request(`https://protected-preview.vercel.app${path}`, {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("public member links", () => {
  it("uses a single HTTPS origin with no path, credentials, query, or trailing slash", () => {
    const url = new URL(PUBLIC_APP_URL);
    expect(url.protocol).toBe("https:");
    expect(url.origin).toBe(PUBLIC_APP_URL);
    expect(url.hostname).toBe("tithing-settlement-cal.vercel.app");
  });
  it("preserves the complete token without allowing query or path injection", () => {
    const token = "abc&other=value/# ?+";
    const url = new URL(rescheduleUrl(token));
    expect(url.origin).toBe(PUBLIC_APP_URL);
    expect(url.pathname).toBe("/reschedule");
    expect([...url.searchParams.keys()]).toEqual(["token"]);
    expect(url.searchParams.get("token")).toBe(token);
    expect(url.hash).toBe("");
  });
  it.each([undefined, "https://wrong-preview.vercel.app", `${PUBLIC_APP_URL}/`, `${PUBLIC_APP_URL}/admin`])(
    "keeps every email on the public app when legacy APP_URL is %s", async (configured) => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", configured);
      vi.stubEnv("VERCEL_URL", "protected-preview.vercel.app");
      vi.stubEnv("CRON_SECRET", "test-cron-secret");
      const booked = await book(request("/api/appointments", { dayId: "day", slotId: "slot", memberName: "Test", email: "test@example.test", phone: "8015550100" }));
      expect(booked.status).toBe(200);
      const moved = await reschedule(request("/api/reschedule", { token: "test-token", slotId: "slot" }, "PATCH"));
      expect(moved.status).toBe(200);
      const reminded = await remind(new Request("https://protected-preview.vercel.app/api/cron/reminders", { headers: { authorization: "Bearer test-cron-secret" } }));
      expect(reminded.status).toBe(200);
      const cancelled = await adminAction(request("/api/admin/schedule", { action: "cancel", appointmentId: "appointment" }));
      expect(cancelled.status).toBe(200);
      expect(sendEmail).toHaveBeenCalledTimes(4);
      for (const [index, call] of sendEmail.mock.calls.entries()) {
        const message = call[0];
        const expected = index === 3 ? PUBLIC_APP_URL : rescheduleUrl("test-token");
        expect(message.text).toContain(expected);
        expect(message.html).toContain(`href="${expected}"`);
        expect(message.html).not.toContain("protected-preview");
        expect(message.html).not.toContain("wrong-preview");
      }
    },
  );
});
