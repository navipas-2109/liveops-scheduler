import type { SessionUser } from "../auth/login";
import { checkBookingAllowed } from "@/domain/booking";
import type { BookingWindowRepository, Clock, SlotRepository } from "../ports";
import { recomputeStatuses } from "./recompute-statuses";

export async function deleteSlot(
  deps: { slots: SlotRepository; bookingWindows: BookingWindowRepository; clock: Clock },
  user: SessionUser,
  slotId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const slot = await deps.slots.findById(slotId);
  if (!slot) return { ok: false, error: "ไม่พบสล็อตนี้" };
  if (user.role !== "MANAGER" && !(user.role === "AE" && slot.aeId === user.userId)) {
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

  await deps.slots.withDatesLocked([slot.date], async (session) => {
    await session.remove(slot.id);
    // Removing a slot can clear a conflict for the slots it clashed with.
    await recomputeStatuses(session, slot.date);
  });
  return { ok: true };
}
