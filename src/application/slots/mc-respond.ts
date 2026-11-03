import type { SessionUser } from "../auth/login";
import type { Notifier, SlotRepository } from "../ports";
import { recomputeStatuses } from "./recompute-statuses";
import { timeRangeLabel } from "./save-slot";

export type McResponse = "confirm" | "unconfirm" | "remove";

// An MC answers for a live they were put on: tick it as confirmed, untick
// it, or take their name off (the Planner is told and finds someone else).
export async function respondToSlot(
  deps: { slots: SlotRepository; notifier: Notifier },
  user: SessionUser,
  slotId: string,
  response: McResponse,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (user.role !== "MC" || !user.mcId) return { ok: false, error: "เฉพาะ MC เท่านั้น" };
  const slot = await deps.slots.findById(slotId);
  if (!slot || slot.mcId !== user.mcId || !slot.mcSent) return { ok: false, error: "ไม่พบไลฟ์นี้ในรายชื่อของคุณ" };
  if (slot.status === "completed") return { ok: false, error: "ไลฟ์นี้จบและบันทึกแล้ว" };

  const result = await deps.slots.withDatesLocked([slot.date], async (session) => {
    const current = (await session.listOnDate(slot.date)).find((s) => s.id === slotId);
    if (!current || current.mcId !== user.mcId) return { ok: false as const, error: "ไม่พบไลฟ์นี้ในรายชื่อของคุณ" };
    if (response === "remove") {
      await session.clearMc(slotId);
      await recomputeStatuses(session, slot.date);
    } else {
      await session.setMcConfirmed(slotId, response === "confirm");
    }
    return { ok: true as const };
  });
  if (!result.ok) return result;

  if (response === "remove") {
    const item = (await deps.slots.list({ from: slot.date, to: slot.date })).find((s) => s.id === slotId);
    await deps.notifier.notify(
      ["planner"],
      `🙅 MC ${user.name} ถอนชื่อออก — ต้องหา MC ใหม่\n${item?.brandName} (${item?.platform})\n${slot.date} ${timeRangeLabel(slot.startMinute, slot.endMinute)} · ${item?.roomName}`,
    );
  }
  return { ok: true };
}
