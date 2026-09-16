import { describe, expect, it } from "vitest";
import { availableBookingStarts } from "../lib/availability";
import type { PublicSlotView } from "../lib/mock-store";

const slot = (id: string, startTime: string, endTime: string, overrides: Partial<PublicSlotView> = {}): PublicSlotView => ({ id, dayId: "day", startTime, endTime, isBuffer: false, isBlocked: false, isReserved: false, createdAt: "2026-01-01T00:00:00Z", ...overrides });

describe("appointment-length availability", () => {
  it("shows all open starts for standard appointments", () => {
    const slots=[slot("one","09:00","09:10"),slot("two","09:10","09:20",{isReserved:true}),slot("three","09:20","09:30")];
    expect(availableBookingStarts(slots,false).map((item)=>item.id)).toEqual(["one","three"]);
  });

  it("only shows starts followed by a consecutive open slot for 20-minute appointments", () => {
    const slots=[slot("one","09:00","09:10"),slot("two","09:10","09:20"),slot("three","09:20","09:30",{isBlocked:true}),slot("four","09:30","09:40")];
    expect(availableBookingStarts(slots,true).map((item)=>item.id)).toEqual(["one"]);
  });
});
