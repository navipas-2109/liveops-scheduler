import type { SessionUser } from "../auth/login";
import { canChangeLocked } from "@/domain/slot-lock";
import type {
  Brand,
  BrandRepository,
  BrandStatusCounts,
  Clock,
  Producer,
  ProducerRepository,
  Room,
  RoomRepository,
  ShiftItem,
  ShiftRepository,
  SlotLock,
  SlotLockRepository,
  SlotListItem,
  SlotRepository,
} from "../ports";
import { monthRange } from "./get-brand-slot-page";

export interface InputPageData {
  date: string;
  today: string;
  month: string;
  shifts: ShiftItem[];
  slots: SlotListItem[];
  rooms: Room[];
  brands: Brand[];
  producers: Producer[];
  squads: string[];
  // Brands with lives this month, and which of them are confirmed.
  brandMonth: (BrandStatusCounts & { lock: SlotLock | null })[];
  lockedBrandIds: string[];
  canChangeLocked: boolean;
}

// Input Live Slot: one day, one row per PD on shift; plus the month's brands
// to confirm and lock.
export async function getInputPage(
  deps: {
    shifts: ShiftRepository;
    slots: SlotRepository;
    rooms: RoomRepository;
    brands: BrandRepository;
    producers: ProducerRepository;
    locks: SlotLockRepository;
    clock: Clock;
  },
  user: SessionUser,
  date: string | null,
): Promise<InputPageData> {
  const today = deps.clock.today();
  const day = date ?? today;
  const month = day.slice(0, 7);
  const { from, to } = monthRange(month);
  const [shifts, slots, rooms, brands, producers, locks, brandCounts] = await Promise.all([
    deps.shifts.listInRange(day, day),
    deps.slots.list({ from: day, to: day }),
    deps.rooms.listAll(),
    deps.brands.listAll(),
    deps.producers.listAll(),
    deps.locks.listForMonth(month),
    deps.slots.countByBrand(from, to),
  ]);
  const lockOf = new Map(locks.map((l) => [l.brandId, l]));
  return {
    date: day,
    today,
    month,
    shifts,
    slots,
    rooms,
    brands,
    producers,
    squads: [...new Set(producers.map((p) => p.squad.trim()).filter(Boolean))].sort(),
    brandMonth: brandCounts.map((b) => ({ ...b, lock: lockOf.get(b.brandId) ?? null })),
    lockedBrandIds: locks.map((l) => l.brandId),
    canChangeLocked: canChangeLocked(user.role),
  };
}
