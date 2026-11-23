import { describe, expect, it } from "vitest";
import { planSlotBlock } from "../lib/slot-block";

describe("planSlotBlock", () => {
  it("fills an empty stretch with consecutive slots", () => {
    const plan = planSlotBlock([], "13:00", "14:00", 10);
    expect(plan.skipped).toBe(0);
    expect(plan.toAdd).toEqual([
      { startTime: "13:00", endTime: "13:10" },
      { startTime: "13:10", endTime: "13:20" },
      { startTime: "13:20", endTime: "13:30" },
      { startTime: "13:30", endTime: "13:40" },
      { startTime: "13:40", endTime: "13:50" },
      { startTime: "13:50", endTime: "14:00" },
    ]);
  });
  it("clamps the final slot to the block end", () => {
    const plan = planSlotBlock([], "13:00", "13:25", 10);
    expect(plan.toAdd.at(-1)).toEqual({ startTime: "13:20", endTime: "13:25" });
  });
  it("skips candidates that overlap existing slots and keeps the rest", () => {
    const existing = [{ startTime: "13:10", endTime: "13:20" }, { startTime: "13:30", endTime: "13:40" }];
    const plan = planSlotBlock(existing, "13:00", "14:00", 10);
    expect(plan.skipped).toBe(2);
    expect(plan.toAdd.map((slot) => slot.startTime)).toEqual(["13:00", "13:20", "13:40", "13:50"]);
  });
  it("skips a candidate that partially overlaps an existing slot", () => {
    const existing = [{ startTime: "13:05", endTime: "13:15" }];
    const plan = planSlotBlock(existing, "13:00", "13:30", 10);
    expect(plan.skipped).toBe(2);
    expect(plan.toAdd).toEqual([{ startTime: "13:20", endTime: "13:30" }]);
  });
  it("treats back-to-back slots as non-overlapping", () => {
    const existing = [{ startTime: "12:50", endTime: "13:00" }, { startTime: "14:00", endTime: "14:10" }];
    const plan = planSlotBlock(existing, "13:00", "14:00", 20);
    expect(plan.skipped).toBe(0);
    expect(plan.toAdd).toHaveLength(3);
  });
  it("rejects invalid ranges and intervals", () => {
    expect(() => planSlotBlock([], "14:00", "13:00", 10)).toThrow(/after start/);
    expect(() => planSlotBlock([], "13:00", "14:00", 3)).toThrow(/between 5 and 60/);
    expect(() => planSlotBlock([], "1pm", "14:00", 10)).toThrow(/valid start and end/);
  });
});
