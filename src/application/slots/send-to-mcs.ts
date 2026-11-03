import type { SessionUser } from "../auth/login";
import type { SlotLockRepository, SlotRepository } from "../ports";
import { monthRange } from "./get-brand-slot-page";

// The Planner checks the MCs put on a month's confirmed lives, then sends
// them; only sent lives appear on each MC's own sheet.
export async function sendToMcs(
  deps: { slots: SlotRepository; locks: SlotLockRepository },
  user: SessionUser,
  month: string,
  slotIds: string[],
): Promise<{ ok: true; value: number } | { ok: false; error: string }> {
  if (user.role !== "PLANNER" && user.role !== "MANAGER") return { ok: false, error: "ส่งให้ MC ได้เฉพาะ Planner" };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  const { from, to } = monthRange(month);
  const [slots, locks] = await Promise.all([deps.slots.list({ from, to }), deps.locks.listForMonth(month)]);
  const locked = new Set(locks.map((l) => l.brandId));
  const wanted = new Set(slotIds);
  const ready = slots.filter(
    (s) => wanted.has(s.id) && s.mcId && !s.mcSent && s.status !== "completed" && locked.has(s.brandId),
  );
  if (ready.length === 0) return { ok: false, error: "ไม่มีสล็อตที่ลง MC แล้วและยังไม่ได้ส่ง" };

  const dates = [...new Set(ready.map((s) => s.date))];
  const sent = await deps.slots.withDatesLocked(dates, async (session) => {
    let n = 0;
    for (const date of dates) {
      const current = new Map((await session.listOnDate(date)).map((s) => [s.id, s]));
      for (const s of ready.filter((r) => r.date === date)) {
        // Skip a live whose MC changed since the page was loaded.
        const now = current.get(s.id);
        if (!now || now.mcId !== s.mcId || now.mcSent) continue;
        await session.markMcSent(s.id);
        n++;
      }
    }
    return n;
  });
  return { ok: true, value: sent };
}
