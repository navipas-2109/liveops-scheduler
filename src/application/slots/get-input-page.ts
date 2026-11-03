import type { SessionUser } from "../auth/login";
import { canChangeLocked } from "@/domain/slot-lock";
import type {
  Brand,
  BrandRepository,
  BrandPlanRepository,
  Clock,
  Producer,
  ProducerRepository,
  Room,
  RoomRepository,
  ShiftItem,
  ShiftRepository,
  SlotLockRepository,
  SlotListItem,
  SlotRepository,
} from "../ports";
import { buildRows, type BrandCheckRow } from "../brand-check/brand-check";

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
  // Brands with a plan or lives this month: hours against plan and status.
  checks: BrandCheckRow[];
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
    plans: BrandPlanRepository;
    clock: Clock;
  },
  user: SessionUser,
  date: string | null,
): Promise<InputPageData> {
  const today = deps.clock.today();
  const day = date ?? today;
  const month = day.slice(0, 7);
  const [shifts, slots, rooms, brands, producers, locks, checks] = await Promise.all([
    deps.shifts.listInRange(day, day),
    deps.slots.list({ from: day, to: day }),
    deps.rooms.listAll(),
    user.role === "AE" ? deps.brands.listForAe(user.userId) : deps.brands.listAll(),
    deps.producers.listAll(),
    deps.locks.listForMonth(month),
    buildRows(deps, user, month),
  ]);
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
    // AEs only see their own brands (buildRows lists brands by role).
    checks: checks.filter((c) => c.planMinutes !== null || c.slotCount > 0),
    lockedBrandIds: locks.map((l) => l.brandId),
    canChangeLocked: canChangeLocked(user.role),
  };
}
