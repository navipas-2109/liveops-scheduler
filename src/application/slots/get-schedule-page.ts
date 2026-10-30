import type { SessionUser } from "../auth/login";
import type { BookingWindow } from "@/domain/booking";
import type { SlotStatus } from "@/domain/slot-rules";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import type {
  BookingWindowRepository,
  Brand,
  BrandRepository,
  Clock,
  Room,
  RoomRepository,
  ShiftItem,
  ShiftRepository,
  SlotListItem,
  SlotRepository,
  StatusCounts,
} from "../ports";
import { monthRange } from "./get-brand-slot-page";

export type ScheduleView = "month" | "week" | "day";
// How the day view splits into rows: one per room, or one per Producer on shift.
export type DayGrouping = "room" | "pd";

export interface DaySummary {
  counts: StatusCounts;
  brands: { name: string; status: SlotStatus }[]; // first few, by start time
  total: number;
}

export interface SchedulePageData {
  view: ScheduleView;
  date: string; // the day the view is anchored on
  from: string;
  to: string;
  today: string;
  roomId: string | null;
  grouping: DayGrouping;
  rooms: Room[];
  shifts: ShiftItem[]; // day view grouped by PD only
  // Month view gets per-day summaries; week and day views get the slots.
  summaries: Record<string, DaySummary>;
  slots: SlotListItem[];
  windows: BookingWindow[];
  brands: Brand[]; // every brand/channel, for the filters
  brandName: string | null;
  platform: string | null;
}

const BRANDS_PER_DAY = 3;

function addDays(date: string, n: number): string {
  const d = fromIsoDate(date);
  d.setUTCDate(d.getUTCDate() + n);
  return toIsoDate(d);
}

// Monday of the week containing `date`.
export function weekStart(date: string): string {
  const weekday = (fromIsoDate(date).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

export function rangeFor(view: ScheduleView, date: string): { from: string; to: string } {
  if (view === "day") return { from: date, to: date };
  if (view === "week") {
    const from = weekStart(date);
    return { from, to: addDays(from, 6) };
  }
  return monthRange(date.slice(0, 7));
}

export async function getSchedulePage(
  deps: {
    slots: SlotRepository;
    rooms: RoomRepository;
    brands: BrandRepository;
    bookingWindows: BookingWindowRepository;
    shifts: ShiftRepository;
    clock: Clock;
  },
  user: SessionUser,
  query: {
    view: ScheduleView;
    date: string | null;
    roomId: string | null;
    grouping: DayGrouping;
    brandName?: string | null;
    platform?: string | null;
  },
): Promise<SchedulePageData> {
  const today = deps.clock.today();
  const date = query.date ?? today;
  const { from, to } = rangeFor(query.view, date);

  const byPd = query.view === "day" && query.grouping === "pd";
  const [rooms, windows, brands, slots, shifts] = await Promise.all([
    deps.rooms.listAll(),
    deps.bookingWindows.listAll(),
    deps.brands.listAll(),
    deps.slots.list({
      from,
      to,
      roomId: query.roomId ?? undefined,
      brandName: query.brandName ?? undefined,
      platform: query.platform ?? undefined,
    }),
    byPd ? deps.shifts.listInRange(from, to) : Promise.resolve([]),
  ]);
  const grouping: DayGrouping = byPd ? "pd" : "room";
  const roomId = query.roomId && rooms.some((r) => r.id === query.roomId) ? query.roomId : null;

  if (query.view !== "month") {
    return {
      view: query.view,
      date,
      from,
      to,
      today,
      roomId,
      grouping,
      rooms,
      shifts,
      summaries: {},
      slots,
      windows,
      brands,
      brandName: query.brandName ?? null,
      platform: query.platform ?? null,
    };
  }

  // A month can hold over a thousand slots, so only send what the grid shows.
  const summaries: Record<string, DaySummary> = {};
  for (const s of slots) {
    const day = (summaries[s.date] ??= { counts: {}, brands: [], total: 0 });
    day.counts[s.status] = (day.counts[s.status] ?? 0) + 1;
    day.total++;
    if (day.brands.length < BRANDS_PER_DAY) day.brands.push({ name: s.brandName, status: s.status });
  }
  return {
    view: "month",
    date,
    from,
    to,
    today,
    roomId,
    grouping,
    rooms,
    shifts: [],
    summaries,
    slots: [],
    windows,
    brands,
    brandName: query.brandName ?? null,
    platform: query.platform ?? null,
  };
}
