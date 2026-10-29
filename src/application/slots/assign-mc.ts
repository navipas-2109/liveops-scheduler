import type { SessionUser } from "../auth/login";
import { rangesOverlap } from "@/domain/time";
import type { BrandRepository, McRepository, Notifier, RoomRepository, SlotRecord, SlotRepository } from "../ports";
import { recomputeStatuses } from "./recompute-statuses";
import { timeRangeLabel } from "./save-slot";

export interface McBooking {
  slotId: string;
  startMinute: number;
  endMinute: number;
  brandName: string;
}

// For the Assign MC panel: which MCs are already on air during this slot.
export async function getBusyMcs(
  deps: { slots: SlotRepository },
  slotId: string,
): Promise<Record<string, McBooking>> {
  const slot = await deps.slots.findById(slotId);
  if (!slot) return {};
  const sameDay = await deps.slots.list({ from: slot.date, to: slot.date });
  const busy: Record<string, McBooking> = {};
  for (const other of sameDay) {
    if (other.id === slot.id || !other.mcId || !rangesOverlap(slot, other)) continue;
    busy[other.mcId] = {
      slotId: other.id,
      startMinute: other.startMinute,
      endMinute: other.endMinute,
      brandName: `${other.brandName} (${other.platform})`,
    };
  }
  return busy;
}

// Planner puts an MC on a slot (or removes one with mcId = null). An MC who
// is already live at an overlapping time can't be assigned.
export async function assignMc(
  deps: {
    slots: SlotRepository;
    mcs: McRepository;
    brands: BrandRepository;
    rooms: RoomRepository;
    notifier: Notifier;
  },
  user: SessionUser,
  slotId: string,
  mcId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (user.role !== "PLANNER" && user.role !== "MANAGER") {
    return { ok: false, error: "เฉพาะ Planner และ Manager เท่านั้นที่ลง MC ได้" };
  }
  const slot = await deps.slots.findById(slotId);
  if (!slot) return { ok: false, error: "ไม่พบสล็อตนี้" };
  if (slot.status === "completed") return { ok: false, error: "ไลฟ์นี้จบและบันทึกแล้ว เปลี่ยน MC ไม่ได้" };
  const mc = mcId ? await deps.mcs.findById(mcId) : null;
  if (mcId && !mc) return { ok: false, error: "ไม่พบ MC นี้" };

  const result = await deps.slots.withDatesLocked([slot.date], async (session) => {
    const sameDay = await session.listOnDate(slot.date);
    const current = sameDay.find((s) => s.id === slotId);
    if (!current) return { ok: false as const, error: "ไม่พบสล็อตนี้" };
    if (current.status === "completed") {
      return { ok: false as const, error: "ไลฟ์นี้จบและบันทึกแล้ว เปลี่ยน MC ไม่ได้" };
    }
    if (mcId) {
      const clash = sameDay.find((o) => o.id !== slotId && o.mcId === mcId && rangesOverlap(current, o));
      if (clash) {
        return {
          ok: false as const,
          error: `${mc!.nickname} ติดไลฟ์อื่นช่วง ${timeRangeLabel(clash.startMinute, clash.endMinute)}`,
        };
      }
    }
    await session.setMc(slotId, mcId, user.userId);
    const newConflicts = await recomputeStatuses(session, slot.date);
    return { ok: true as const, slot: current, newConflicts };
  });
  if (!result.ok) return result;

  await notifyAssigned(deps, user, result.slot, mc?.nickname ?? null, result.newConflicts.length);
  return { ok: true };
}

async function notifyAssigned(
  deps: { brands: BrandRepository; rooms: RoomRepository; notifier: Notifier },
  user: SessionUser,
  slot: SlotRecord,
  mcName: string | null,
  newConflicts: number,
) {
  const [brands, rooms] = await Promise.all([deps.brands.listAll(), deps.rooms.listAll()]);
  const brand = brands.find((b) => b.id === slot.brandId);
  const room = rooms.find((r) => r.id === slot.roomId);
  const what = `${brand?.brandName} (${brand?.platform})\n${slot.date} ${timeRangeLabel(slot.startMinute, slot.endMinute)} · ${room?.shortName}`;
  await deps.notifier.notify(
    ["planner"],
    mcName ? `🎙️ ลง MC ${mcName} แล้ว\n${what}\nโดย ${user.name}` : `↩️ ถอด MC ออก\n${what}\nโดย ${user.name}`,
  );
  if (newConflicts > 0) {
    await deps.notifier.notify(
      ["planner", "operation"],
      `⚠️ พบคิวชน ${newConflicts} สล็อต วันที่ ${slot.date} — กรุณาตรวจสอบใน MC Planning`,
    );
  }
}
