import type { SessionUser } from "../auth/login";
import type { ProducerRepository, ShiftMonthRepository, SlotLockRepository, SlotRepository } from "../ports";
import { lockedFor, waitingForShifts } from "./save-slot";

const CAN_BOOK = ["AE", "MANAGER", "PLANNER", "OPERATION"];

// Some brands run one live with two PDs. Instead of booking the room twice,
// the second PD joins the existing live (first free PD seat).
export async function joinSlot(
  deps: {
    slots: SlotRepository;
    producers: ProducerRepository;
    locks: SlotLockRepository;
    shiftMonths: ShiftMonthRepository;
  },
  user: SessionUser,
  slotId: string,
  producerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!CAN_BOOK.includes(user.role)) return { ok: false, error: "คุณไม่มีสิทธิ์ลงสล็อต" };
  const slot = await deps.slots.findById(slotId);
  if (!slot) return { ok: false, error: "ไม่พบสล็อตนี้" };
  if (user.role === "AE" && slot.aeId !== user.userId) return { ok: false, error: "แก้ไขได้เฉพาะสล็อตของคุณเอง" };
  if (slot.status === "completed") return { ok: false, error: "ไลฟ์นี้จบและบันทึกแล้ว" };
  const shiftsPending = await waitingForShifts(deps.shiftMonths, user, [slot.date]);
  if (shiftsPending) return { ok: false, error: shiftsPending };
  const locked = await lockedFor(deps.locks, user, [slot]);
  if (locked) return { ok: false, error: locked };
  if (!(await deps.producers.listAll()).some((p) => p.id === producerId)) {
    return { ok: false, error: "ไม่พบ Producer ที่เลือก" };
  }

  return deps.slots.withDatesLocked([slot.date], async (session) => {
    const current = (await session.listOnDate(slot.date)).find((s) => s.id === slotId);
    if (!current) return { ok: false as const, error: "ไม่พบสล็อตนี้" };
    const { producerId: pd1, admin1Id: pd2, admin2Id } = current;
    if (pd1 === producerId || pd2 === producerId) return { ok: false as const, error: "PD คนนี้อยู่ในไลฟ์นี้แล้ว" };
    if (pd1 && pd2) return { ok: false as const, error: "ไลฟ์นี้มี PD ครบ 2 คนแล้ว" };
    await session.setStaff(
      slotId,
      pd1 ? { producerId: pd1, admin1Id: producerId, admin2Id } : { producerId, admin1Id: pd2, admin2Id },
    );
    return { ok: true as const };
  });
}
