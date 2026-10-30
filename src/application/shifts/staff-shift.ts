import type { SessionUser } from "../auth/login";
import { isStaffReady } from "@/domain/slot-rules";
import type {
  Clock,
  Producer,
  ProducerRepository,
  ShiftItem,
  ShiftRepository,
  SlotListItem,
  SlotRepository,
  SlotStaff,
} from "../ports";

export interface StaffShiftPageData {
  date: string;
  today: string;
  shifts: ShiftItem[];
  slots: SlotListItem[];
  producers: Producer[];
  summary: { onShift: number; office: number; away: number; lives: number; ready: number };
  canEdit: boolean;
}

export async function getStaffShiftPage(
  deps: { shifts: ShiftRepository; slots: SlotRepository; producers: ProducerRepository; clock: Clock },
  user: SessionUser,
  date: string | null,
): Promise<StaffShiftPageData> {
  const today = deps.clock.today();
  const day = date ?? today;
  const [shifts, slots, producers] = await Promise.all([
    deps.shifts.listInRange(day, day),
    deps.slots.list({ from: day, to: day }),
    deps.producers.listAll(),
  ]);
  return {
    date: day,
    today,
    shifts,
    slots,
    producers,
    summary: {
      onShift: shifts.filter((s) => s.kind === "live").length,
      office: shifts.filter((s) => s.kind === "office").length,
      away: shifts.filter((s) => s.kind === "off" || s.kind === "leave").length,
      lives: slots.length,
      ready: slots.filter(isStaffReady).length,
    },
    canEdit: user.role === "OPERATION" || user.role === "MANAGER",
  };
}

// Operation puts the Producer and Live Admins on a live. A live is "ready"
// once it has a Producer and a first Admin.
export async function assignStaff(
  deps: { slots: SlotRepository; producers: ProducerRepository },
  user: SessionUser,
  slotId: string,
  staff: SlotStaff,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (user.role !== "OPERATION" && user.role !== "MANAGER") {
    return { ok: false, error: "เฉพาะ Operation และ Manager เท่านั้นที่ลงทีมงานได้" };
  }
  const slot = await deps.slots.findById(slotId);
  if (!slot) return { ok: false, error: "ไม่พบสล็อตนี้" };
  if (slot.status === "completed") return { ok: false, error: "ไลฟ์นี้จบและบันทึกแล้ว" };

  const known = new Set((await deps.producers.listAll()).map((p) => p.id));
  const chosen = [staff.producerId, staff.admin1Id, staff.admin2Id].filter((id): id is string => !!id);
  if (chosen.some((id) => !known.has(id))) return { ok: false, error: "ไม่พบพนักงานที่เลือก" };
  if (new Set(chosen).size !== chosen.length) {
    return { ok: false, error: "คนเดียวกันเป็นทั้ง Producer และ Admin ในไลฟ์เดียวกันไม่ได้" };
  }
  if (!staff.admin1Id && staff.admin2Id) return { ok: false, error: "กรุณาเลือก Admin 1 ก่อน Admin 2" };

  await deps.slots.withDatesLocked([slot.date], (session) => session.setStaff(slotId, staff));
  return { ok: true };
}
