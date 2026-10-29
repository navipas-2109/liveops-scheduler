import type { SessionUser } from "../auth/login";
import { currentWindow, type BookingWindow } from "@/domain/booking";
import type { SlotStatus } from "@/domain/slot-rules";
import type {
  BookingWindowRepository,
  Clock,
  Mc,
  McRepository,
  SlotListItem,
  SlotRepository,
  StatusCounts,
} from "../ports";
import { monthRange } from "./get-brand-slot-page";

export interface McPlanningPageData {
  today: string;
  month: string;
  day: string | null;
  status: SlotStatus | null;
  bannerWindow: BookingWindow | null;
  bannerOpen: boolean;
  counts: StatusCounts;
  slots: SlotListItem[];
  limit: number;
  mcs: Mc[];
  canAssign: boolean;
}

const LIMIT = 400;

export async function getMcPlanningPage(
  deps: { slots: SlotRepository; mcs: McRepository; bookingWindows: BookingWindowRepository; clock: Clock },
  user: SessionUser,
  query: { month: string; day: string | null; status: SlotStatus | null },
): Promise<McPlanningPageData> {
  const today = deps.clock.today();
  const range = monthRange(query.month);
  const day = query.day && query.day >= range.from && query.day <= range.to ? query.day : null;
  const from = day ?? range.from;
  const to = day ?? range.to;

  const [windows, byDay, slots, mcs] = await Promise.all([
    deps.bookingWindows.listAll(),
    deps.slots.countByDay(from, to),
    deps.slots.list({ from, to, status: query.status ?? undefined, limit: LIMIT }),
    deps.mcs.listAll(),
  ]);

  const counts: StatusCounts = {};
  for (const dayCounts of Object.values(byDay)) {
    for (const [status, n] of Object.entries(dayCounts) as [SlotStatus, number][]) {
      counts[status] = (counts[status] ?? 0) + n;
    }
  }

  const bannerWindow = currentWindow(windows, today);
  return {
    today,
    month: query.month,
    day,
    status: query.status,
    bannerWindow,
    bannerOpen: !!bannerWindow && bannerWindow.openFrom <= today && today <= bannerWindow.openTo,
    counts,
    slots,
    limit: LIMIT,
    mcs,
    canAssign: user.role === "PLANNER" || user.role === "MANAGER",
  };
}
