import type { SessionUser } from "../auth/login";
import { checkBookingAllowed, currentWindow, type BookingCheck, type BookingWindow } from "@/domain/booking";
import type { SlotStatus } from "@/domain/slot-rules";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import type {
  BookingWindowRepository,
  Brand,
  BrandRepository,
  BrandStatusCounts,
  Clock,
  Room,
  RoomRepository,
  SlotListItem,
  SlotRepository,
  StatusCounts,
} from "../ports";

export interface BrandSlotPageQuery {
  month: string; // "2026-08"
  day: string | null; // "2026-08-14"
  brandName: string | null;
  status: SlotStatus | null;
}

export interface BrandSlotPageData {
  today: string;
  month: string;
  day: string | null;
  bannerWindow: BookingWindow | null;
  bannerOpen: boolean;
  monthBooking: BookingCheck;
  brands: Brand[];
  rooms: Room[];
  dayCounts: Record<string, StatusCounts>;
  daySlots: SlotListItem[];
  brandSummary: BrandStatusCounts[];
  mySlots: SlotListItem[];
  mySlotsLimit: number;
}

const MY_SLOTS_LIMIT = 300;

export function monthRange(month: string): { from: string; to: string } {
  const first = fromIsoDate(`${month}-01`);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return { from: `${month}-01`, to: toIsoDate(last) };
}

export async function getBrandSlotPage(
  deps: {
    slots: SlotRepository;
    brands: BrandRepository;
    rooms: RoomRepository;
    bookingWindows: BookingWindowRepository;
    clock: Clock;
  },
  user: SessionUser,
  query: BrandSlotPageQuery,
): Promise<BrandSlotPageData> {
  const today = deps.clock.today();
  const { from, to } = monthRange(query.month);
  const day = query.day && query.day >= from && query.day <= to ? query.day : null;
  // AEs see their own slots in the list and summary; room availability is
  // always shown for everyone's bookings.
  const aeId = user.role === "AE" ? user.userId : undefined;

  const [windows, brands, rooms, dayCounts, daySlots, brandSummary, mySlots] = await Promise.all([
    deps.bookingWindows.listAll(),
    user.role === "AE" ? deps.brands.listForAe(user.userId) : deps.brands.listAll(),
    deps.rooms.listAll(),
    deps.slots.countByDay(from, to),
    day ? deps.slots.list({ from: day, to: day }) : Promise.resolve([]),
    deps.slots.countByBrand(from, to, aeId),
    deps.slots.list({
      from,
      to,
      aeId,
      brandName: query.brandName ?? undefined,
      status: query.status ?? undefined,
      limit: MY_SLOTS_LIMIT,
    }),
  ]);

  const bannerWindow = currentWindow(windows, today);
  return {
    today,
    month: query.month,
    day,
    bannerWindow,
    bannerOpen: !!bannerWindow && bannerWindow.openFrom <= today && today <= bannerWindow.openTo,
    monthBooking: checkBookingAllowed(user.role, windows, from, today),
    brands,
    rooms,
    dayCounts,
    daySlots,
    brandSummary,
    mySlots,
    mySlotsLimit: MY_SLOTS_LIMIT,
  };
}
