export type SlotRange = { startTime: string; endTime: string };
export type SlotBlockPlan = { toAdd: SlotRange[]; skipped: number };

const toMinutes = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Plans a run of consecutive slots across a block of time for a day that
// already has slots. Candidates that overlap any existing slot are skipped
// (and counted) instead of duplicated or shifted, so extending a day never
// disturbs times that are already there — including booked ones. The final
// slot is clamped to the block end, matching initial day generation.
export function planSlotBlock(existing: SlotRange[], startTime: string, endTime: string, intervalMinutes: number): SlotBlockPlan {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) throw new Error("Enter valid start and end times.");
  if (end <= start) throw new Error("End time must be after start time.");
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 5 || intervalMinutes > 60) throw new Error("Interval must be between 5 and 60 minutes.");

  const existingRanges = existing
    .map((slot) => ({ start: toMinutes(slot.startTime), end: toMinutes(slot.endTime) }))
    .filter((range): range is { start: number; end: number } => range.start !== null && range.end !== null);

  const toAdd: SlotRange[] = [];
  let skipped = 0;
  for (let cursor = start; cursor < end; cursor += intervalMinutes) {
    const candidate = { start: cursor, end: Math.min(cursor + intervalMinutes, end) };
    const overlaps = existingRanges.some((range) => candidate.start < range.end && range.start < candidate.end);
    if (overlaps) { skipped += 1; continue; }
    toAdd.push({ startTime: toTime(candidate.start), endTime: toTime(candidate.end) });
    existingRanges.push(candidate);
  }
  return { toAdd, skipped };
}
