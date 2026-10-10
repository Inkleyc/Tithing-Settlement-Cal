import { describe, expect, it } from "vitest";
import { todayInAppTimeZone } from "../lib/dates";

describe("application date", () => {
  it("uses Mountain Time around the UTC date boundary", () => {
    expect(todayInAppTimeZone(new Date("2026-10-10T05:30:00Z"))).toBe("2026-10-09");
  });
});
