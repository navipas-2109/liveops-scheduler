import type { SessionUser } from "../auth/login";
import type {
  BrandRepository,
  Clock,
  Mc,
  McRepository,
  SlotListItem,
  SlotLockRepository,
  SlotRepository,
} from "../ports";
import { monthRange } from "./get-brand-slot-page";

// Planner fills MCs in; an AE follows their own brands; an MC answers for
// the lives they were put on.
export type SheetViewer = "planner" | "ae" | "mc";

export interface McSheetPageData {
  month: string;
  today: string;
  viewer: SheetViewer;
  // Lives of the brands confirmed for the month, brand by brand, like the
  // team's planning sheet. For an AE the MC shows only once the MC confirmed.
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

function viewerOf(user: SessionUser): SheetViewer {
  if (user.role === "MC") return "mc";
  if (user.role === "AE") return "ae";
  return "planner";
}

export async function getMcSheetPage(
  deps: { slots: SlotRepository; locks: SlotLockRepository; mcs: McRepository; brands: BrandRepository; clock: Clock },
  user: SessionUser,
  month: string,
): Promise<McSheetPageData> {
  const viewer = viewerOf(user);
  const { from, to } = monthRange(month);
  const [slots, locks, mcs, own] = await Promise.all([
    deps.slots.list({ from, to }),
    deps.locks.listForMonth(month),
    viewer === "planner" ? deps.mcs.listAll() : Promise.resolve([]),
    viewer === "ae" ? deps.brands.listForAe(user.userId) : Promise.resolve(null),
  ]);
  const locked = new Set(locks.map((l) => l.brandId));
  const ownBrands = own && new Set(own.map((b) => b.id));
  const visible = (s: SlotListItem) =>
    viewer === "mc" ? s.mcId === user.mcId : !ownBrands || ownBrands.has(s.brandId);

  const pending = new Map<string, { brandName: string; platform: string; total: number }>();
  for (const s of slots) {
    if (locked.has(s.brandId) || viewer === "mc" || !visible(s)) continue;
    const p = pending.get(s.brandId) ?? { brandName: s.brandName, platform: s.platform, total: 0 };
    p.total++;
    pending.set(s.brandId, p);
  }

  const rows = slots
    .filter((s) => locked.has(s.brandId) && visible(s))
    .map((s) => (viewer === "ae" && !s.mcConfirmed ? { ...s, mcName: null } : s))
    .sort(sheetOrder);

  return {
    month,
    today: deps.clock.today(),
    viewer,
    rows,
    mcs,
    pending: [...pending.values()].sort((a, b) => a.brandName.localeCompare(b.brandName)),
    canAssign: viewer === "planner" && (user.role === "PLANNER" || user.role === "MANAGER"),
  };
}
