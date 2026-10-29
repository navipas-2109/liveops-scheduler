import { deriveSlotStatus, findConflicts } from "@/domain/slot-rules";
import type { SlotRecord, SlotWriteSession } from "../ports";

// Re-derives the status of every slot on a date after something on that date
// changed. Returns the slots that have just become conflicts.
export async function recomputeStatuses(
  session: SlotWriteSession,
  date: string,
): Promise<SlotRecord[]> {
  const slots = await session.listOnDate(date);
  const newConflicts: SlotRecord[] = [];
  for (const slot of slots) {
    const next = deriveSlotStatus(slot.status, slot.mcId, findConflicts(slot, slots));
    if (next === slot.status) continue;
    await session.setStatus(slot.id, next);
    if (next === "conflict") newConflicts.push({ ...slot, status: next });
  }
  return newConflicts;
}
