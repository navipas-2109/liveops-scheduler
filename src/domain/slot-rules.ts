import { rangesOverlap, type TimeRange } from "./time";

export type SlotStatus = "empty" | "waiting" | "confirmed" | "conflict" | "completed";

export interface SlotForConflictCheck extends TimeRange {
  id: string;
  date: string; // YYYY-MM-DD
  roomId: string;
  mcId: string | null;
}

export interface SlotConflicts {
  roomClashes: string[]; // ids of other slots booked in the same room
  mcClashes: string[]; // ids of other slots where the same MC is on air
}

// `others` should be the slots on the same date; the date is re-checked anyway.
export function findConflicts(
  slot: SlotForConflictCheck,
  others: SlotForConflictCheck[],
): SlotConflicts {
  const overlapping = others.filter(
    (o) => o.id !== slot.id && o.date === slot.date && rangesOverlap(slot, o),
  );
  return {
    roomClashes: overlapping.filter((o) => o.roomId === slot.roomId).map((o) => o.id),
    mcClashes: slot.mcId
      ? overlapping.filter((o) => o.mcId === slot.mcId).map((o) => o.id)
      : [],
  };
}

export function hasConflict(conflicts: SlotConflicts): boolean {
  return conflicts.roomClashes.length > 0 || conflicts.mcClashes.length > 0;
}

// A completed slot keeps its status; everything else follows MC + conflicts.
// A room clash without an MC is still a conflict, so it gets fixed early.
export function deriveSlotStatus(
  current: SlotStatus,
  mcId: string | null,
  conflicts: SlotConflicts,
): SlotStatus {
  if (current === "completed") return "completed";
  if (hasConflict(conflicts)) return "conflict";
  return mcId ? "confirmed" : "waiting";
}

// Readiness is shown as a flag in the UI and does not change the status.
export function isStaffReady(slot: { producerId: string | null; admin1Id: string | null }) {
  return slot.producerId !== null && slot.admin1Id !== null;
}
