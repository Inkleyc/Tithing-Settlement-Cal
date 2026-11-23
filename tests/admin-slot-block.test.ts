import { afterEach, describe, expect, it, vi } from "vitest";

const { repository } = vi.hoisted(() => ({
  repository: {
    archivePastDays: vi.fn().mockResolvedValue(0),
    getAdminSchedule: vi.fn().mockResolvedValue([]),
    getArchivedSchedule: vi.fn().mockResolvedValue([]),
    getWardName: vi.fn().mockResolvedValue("Test Ward"),
    getAdminPhone: vi.fn().mockResolvedValue("8015550100"),
    getAdminContact: vi.fn().mockResolvedValue({ name: "", email: "" }),
    getSlotsForDay: vi.fn().mockResolvedValue([{ id: "existing", dayId: "day", startTime: "13:10", endTime: "13:20", isBuffer: false, isBlocked: false, isReserved: true }]),
    addTimeSlot: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock("../lib/repository", () => ({ getRepository: () => repository }));
vi.mock("../lib/authorization", () => ({ requireAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("../lib/google-calendar", () => ({ isGoogleCalendarConfigured: () => false, syncGoogleCalendar: vi.fn() }));
vi.mock("../lib/calendar-sync-trigger", () => ({ scheduleCalendarSync: vi.fn().mockResolvedValue(undefined) }));

import { POST as adminAction } from "../app/api/admin/schedule/route";

afterEach(() => { vi.clearAllMocks(); });

describe("admin add-slot-block", () => {
  it("adds the non-overlapping slots of a block to an existing day", async () => {
    const response = await adminAction(new Request("https://example.test/api/admin/schedule", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-slot-block", dayId: "day", startTime: "13:00", endTime: "13:30", intervalMinutes: 10 }),
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.slotBlock).toEqual({ added: 2, skipped: 1, firstOverlap: { startTime: "13:10", endTime: "13:20" } });
    expect(repository.addTimeSlot).toHaveBeenCalledTimes(2);
    expect(repository.addTimeSlot).toHaveBeenCalledWith("day", "13:00", "13:10", false);
    expect(repository.addTimeSlot).toHaveBeenCalledWith("day", "13:20", "13:30", false);
  });
  it("rejects a single slot that runs more than 2 hours (AM/PM slip guard)", async () => {
    const response = await adminAction(new Request("https://example.test/api/admin/schedule", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-slot", dayId: "day", startTime: "10:20", endTime: "22:30" }),
    }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/AM\/PM/);
    expect(repository.addTimeSlot).not.toHaveBeenCalled();
  });
  it("rejects a block whose end is not after its start", async () => {
    const response = await adminAction(new Request("https://example.test/api/admin/schedule", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-slot-block", dayId: "day", startTime: "13:30", endTime: "13:00", intervalMinutes: 10 }),
    }));
    expect(response.status).toBe(400);
    expect(repository.addTimeSlot).not.toHaveBeenCalled();
  });
});
