import type { SessionUser } from "../auth/login";
import type { Clock, Mc, McRepository, SlotListItem, SlotLockRepository, SlotRepository } from "../ports";
import { monthRange } from "./get-brand-slot-page";

export interface McSheetPageData {
  month: string;
  today: string;
  // Lives of the brands confirmed for the month, brand by brand, like the
  // team's planning sheet.
  rows: SlotListItem[];
  mcs: Mc[];
  // Brands with lives this month that the AE hasn't confirmed yet.
  pending: { brandName: string; platform: string; total: number }[];
  canAssign: boolean;
}

export function sheetOrder(a: SlotListItem, b: SlotListItem): number {
  return (
    a.brandName.localeCompare(b.brandName) ||
    a.platform.localeCompare(b.platform) ||
    a.date.localeCompare(b.date) ||
    a.startMinute - b.startMinute
  );
}

export async function getMcSheetPage(
  deps: { slots: SlotRepository; locks: SlotLockRepository; mcs: McRepository; clock: Clock },
  user: SessionUser,
  month: string,
): Promise<McSheetPageData> {
  const { from, to } = monthRange(month);
  const [slots, locks, mcs] = await Promise.all([
    deps.slots.list({ from, to }),
    deps.locks.listForMonth(month),
    deps.mcs.listAll(),
  ]);
  const locked = new Set(locks.map((l) => l.brandId));

  const pending = new Map<string, { brandName: string; platform: string; total: number }>();
  for (const s of slots) {
    if (locked.has(s.brandId)) continue;
    const p = pending.get(s.brandId) ?? { brandName: s.brandName, platform: s.platform, total: 0 };
    p.total++;
    pending.set(s.brandId, p);
  }

  return {
    month,
    today: deps.clock.today(),
    rows: slots.filter((s) => locked.has(s.brandId)).sort(sheetOrder),
    mcs,
    pending: [...pending.values()].sort((a, b) => a.brandName.localeCompare(b.brandName)),
    canAssign: user.role === "PLANNER" || user.role === "MANAGER",
  };
}
