import { afterEach, describe, expect, it, vi } from "vitest";

const { afterCallbacks, syncGoogleCalendar, calendarConfigured, repository } = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => Promise<void>>,
  syncGoogleCalendar: vi.fn().mockResolvedValue({ created: 0, updated: 0, deleted: 0, unchanged: 1 }),
  calendarConfigured: { value: true },
  repository: {
    getAdminSchedule: vi.fn().mockResolvedValue([]),
    getWardName: vi.fn().mockResolvedValue("Test Ward"),
  },
}));
vi.mock("next/server", () => ({ after: (callback: () => Promise<void>) => { afterCallbacks.push(callback); } }));
vi.mock("../lib/google-calendar", () => ({ isGoogleCalendarConfigured: () => calendarConfigured.value, syncGoogleCalendar }));
vi.mock("../lib/repository", () => ({ getRepository: () => repository }));

import { scheduleCalendarSync, syncCalendarNow } from "../lib/calendar-sync-trigger";

afterEach(() => { vi.clearAllMocks(); afterCallbacks.length = 0; calendarConfigured.value = true; });

describe("instant calendar sync trigger", () => {
  it("does nothing when Google Calendar is not configured", async () => {
    calendarConfigured.value = false;
    await syncCalendarNow();
    expect(syncGoogleCalendar).not.toHaveBeenCalled();
  });
  it("syncs the current schedule when configured", async () => {
    await syncCalendarNow();
    expect(repository.getAdminSchedule).toHaveBeenCalledTimes(1);
    expect(syncGoogleCalendar).toHaveBeenCalledWith([], "Test Ward");
  });
  it("schedules the sync to run after the response", async () => {
    await scheduleCalendarSync();
    expect(afterCallbacks).toHaveLength(1);
    expect(syncGoogleCalendar).not.toHaveBeenCalled();
    await afterCallbacks[0]();
    expect(syncGoogleCalendar).toHaveBeenCalledTimes(1);
  });
  it("swallows sync failures so a booking is never affected", async () => {
    syncGoogleCalendar.mockRejectedValueOnce(new Error("Google down"));
    await scheduleCalendarSync();
    await expect(afterCallbacks[0]()).resolves.toBeUndefined();
  });
});
