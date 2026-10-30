import type { SessionUser } from "../auth/login";
import { checkBookingAllowed } from "@/domain/booking";
import type { BookingWindowRepository, Clock, SlotLockRepository, SlotRepository } from "../ports";
import { recomputeStatuses } from "./recompute-statuses";
import { lockedFor } from "./save-slot";

export async function deleteSlot(
  deps: { slots: SlotRepository; bookingWindows: BookingWindowRepository; locks: SlotLockRepository; clock: Clock },
  user: SessionUser,
  slotId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const slot = await deps.slots.findById(slotId);
  if (!slot) return { ok: false, error: "ไม่พบสล็อตนี้" };
  if (user.role === "AE" ? slot.aeId !== user.userId : !["MANAGER", "PLANNER", "OPERATION"].includes(user.role)) {
    return { ok: false, error: "ลบได้เฉพาะสล็อตของตัวเอง" };
  }
  if (slot.status === "completed") return { ok: false, error: "สล็อตนี้ไลฟ์เสร็จแล้ว ลบไม่ได้" };
  const check = checkBookingAllowed(
    user.role,
    await deps.bookingWindows.listAll(),
    slot.date,
    deps.clock.today(),
  );
  if (!check.ok) return { ok: false, error: check.reason };
  const locked = await lockedFor(deps.locks, user, [slot]);
  if (locked) return { ok: false, error: locked };

  await deps.slots.withDatesLocked([slot.date], async (session) => {
    await session.remove(slot.id);
    // Removing a slot can clear a conflict for the slots it clashed with.
    await recomputeStatuses(session, slot.date);
  });
  return { ok: true };
}
