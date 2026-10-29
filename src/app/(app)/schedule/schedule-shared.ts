import type { Room, ShiftItem, SlotListItem } from "@/application/ports";
import type { SlotStatus } from "@/domain/slot-rules";
import { fromLiveMinutes, LIVE_DAY_END, LIVE_DAY_START } from "@/domain/time";

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

export interface TimelineRow {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  shift: { start: number; end: number } | null;
  slots: SlotListItem[];
  roomId: string | null; // set when empty cells in this row can add a slot
  warn?: boolean;
}

const NO_PD = "__none__";

// Day view grouped by Producer: everyone on shift that day (by shift start),
// then anyone assigned a slot without a shift, then slots with no PD yet.
export function pdRows(slots: SlotListItem[], shifts: ShiftItem[]): TimelineRow[] {
  const rows = new Map<string, TimelineRow>();
  for (const sh of shifts) {
    const existing = rows.get(sh.producerId);
    if (existing?.shift) {
      // Two shifts in one day: show the span from first start to last end.
      existing.shift = {
        start: Math.min(existing.shift.start, sh.shiftStart),
        end: Math.max(existing.shift.end, sh.shiftEnd),
      };
      continue;
    }
    rows.set(sh.producerId, {
      id: sh.producerId,
      title: sh.producerName,
      subtitle: `${sh.position} · กะ ${fromLiveMinutes(sh.shiftStart)}–${fromLiveMinutes(sh.shiftEnd)}`,
      accent: "#4c8dff",
      shift: { start: sh.shiftStart, end: sh.shiftEnd },
      slots: [],
      roomId: null,
    });
  }
  for (const s of slots) {
    const key = s.producerId ?? NO_PD;
    if (!rows.has(key)) {
      rows.set(key, {
        id: key,
        title: s.producerId ? (s.producerName ?? "—") : "ยังไม่มี PD",
        subtitle: s.producerId ? "ไม่มีกะในวันนี้" : "สล็อตที่ยังไม่ได้ลง Producer",
        accent: s.producerId ? "#f6c26b" : "#f59e9e",
        shift: null,
        slots: [],
        roomId: null,
        warn: true,
      });
    }
    rows.get(key)!.slots.push(s);
  }
  const rank = (r: TimelineRow) => (r.id === NO_PD ? 2 : r.shift ? 0 : 1);
  return [...rows.values()].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.shift?.start ?? 0) - (b.shift?.start ?? 0) ||
      a.title.localeCompare(b.title),
  );
}

export function outsideShift(slot: SlotListItem, shift: TimelineRow["shift"]): boolean {
  return !!shift && (slot.startMinute < shift.start || slot.endMinute > shift.end);
}
