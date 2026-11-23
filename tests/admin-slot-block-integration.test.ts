import { describe, expect, it, vi } from "vitest";

// Only the admin gate is mocked: this runs the real route against the real
// in-memory repository (no Supabase env in tests), the same code path the
// deployed app uses apart from the storage backend.
vi.mock("../lib/authorization", () => ({ requireAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../lib/calendar-sync-trigger", () => ({ scheduleCalendarSync: vi.fn().mockResolvedValue(undefined) }));

import { POST as adminAction } from "../app/api/admin/schedule/route";

const post = (body: object) => adminAction(new Request("https://example.test/api/admin/schedule", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}));

describe("add-slot-block against the real repository", () => {
  it("extends a generated day, skipping the part that already exists", async () => {
    const generated = await post({ action: "generate", date: "2030-01-06", startTime: "10:00", endTime: "11:00", intervalMinutes: 10, bufferEveryMinutes: 180 });
    expect(generated.status).toBe(200);
    const generatedBody = await generated.json();
    const day = generatedBody.schedule.find((item: { day: { date: string } }) => item.day.date === "2030-01-06");
    expect(day).toBeTruthy();
    expect(day.slots).toHaveLength(6);

    const extended = await post({ action: "add-slot-block", dayId: day.day.id, startTime: "10:50", endTime: "11:30", intervalMinutes: 10 });
    expect(extended.status).toBe(200);
    const extendedBody = await extended.json();
    expect(extendedBody.slotBlock).toEqual({ added: 3, skipped: 1 });
    const after = extendedBody.schedule.find((item: { day: { id: string } }) => item.day.id === day.day.id);
    expect(after.slots.map((slot: { startTime: string }) => slot.startTime)).toEqual([
      "10:00", "10:10", "10:20", "10:30", "10:40", "10:50", "11:00", "11:10", "11:20",
    ]);
  });
});
