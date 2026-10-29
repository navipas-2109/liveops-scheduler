import type { Room, SlotListItem } from "@/application/ports";
import type { SlotStatus } from "@/domain/slot-rules";
import { LIVE_DAY_END, LIVE_DAY_START } from "@/domain/time";

// Room accent colours from the prototype, assigned in room order.
const ROOM_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4",
  "#84CC16", "#F97316", "#EC4899", "#6366F1", "#14B8A6", "#A855F7",
];

export function roomColors(rooms: Room[]): Record<string, string> {
  return Object.fromEntries(rooms.map((r, i) => [r.id, ROOM_COLORS[i % ROOM_COLORS.length]]));
}

// Block backgrounds per status for the timeline views.
export const BLOCK_STYLE: Record<SlotStatus, string> = {
  empty: "bg-line text-soft",
  waiting: "bg-waiting-bg text-waiting-fg",
  confirmed: "bg-confirmed-bg text-confirmed-fg",
  conflict: "bg-conflict-bg text-conflict-fg ring-1 ring-conflict-fg/60",
  completed: "bg-completed-bg text-completed-fg",
};

export const HOURS: number[] = [];
for (let m = LIVE_DAY_START; m < LIVE_DAY_END; m += 60) HOURS.push(m);

const SPAN = LIVE_DAY_END - LIVE_DAY_START;

// Horizontal position of a time range as percentages of the 07:00–02:00 axis.
export function place(start: number, end: number) {
  const left = ((Math.max(start, LIVE_DAY_START) - LIVE_DAY_START) / SPAN) * 100;
  const right = ((Math.min(end, LIVE_DAY_END) - LIVE_DAY_START) / SPAN) * 100;
  return { left: `${left}%`, width: `${Math.max(right - left, 0.5)}%` };
}

// Puts overlapping slots on separate lanes so none hide each other.
export function assignLanes(slots: SlotListItem[]): SlotListItem[][] {
  const lanes: SlotListItem[][] = [];
  const sorted = [...slots].sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  for (const slot of sorted) {
    const lane = lanes.find((l) => l[l.length - 1].endMinute <= slot.startMinute);
    if (lane) lane.push(slot);
    else lanes.push([slot]);
  }
  return lanes;
}
