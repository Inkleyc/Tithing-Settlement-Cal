import type { PublicSlotView } from "./mock-store";

const isOpen = (slot: PublicSlotView) => !slot.isReserved && !slot.isBuffer && !slot.isBlocked;

export function availableBookingStarts(slots: PublicSlotView[], needsDoubleSlot: boolean) {
  const open = slots.filter(isOpen);
  if (!needsDoubleSlot) return open;
  return open.filter((slot) => slots.some((next) => next.startTime === slot.endTime && isOpen(next)));
}
