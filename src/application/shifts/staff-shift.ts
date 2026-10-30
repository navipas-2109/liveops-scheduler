import type { SessionUser } from "../auth/login";
import { isStaffReady } from "@/domain/slot-rules";
import type {
  Clock,
  Producer,
  ProducerRepository,
  ShiftItem,
  ShiftRepository,
  SlotListItem,
  SlotRepository,
  SlotStaff,
} from "../ports";

export interface StaffShiftPageData {
  date: string;
  today: string;
  shifts: ShiftItem[];
  slots: SlotListItem[];
  producers: Producer[];
  summary: { onShift: number; office: number; away: number; lives: number; ready: number };
  canEdit: boolean;
}

export async function getStaffShiftPage(
  deps: { shifts: ShiftRepository; slots: SlotRepository; producers: ProducerRepository; clock: Clock },
  user: SessionUser,
  date: string | null,
): Promise<StaffShiftPageData> {
  const today = deps.clock.today();
  const day = date ?? today;
  const [shifts, slots, producers] = await Promise.all([
    deps.shifts.listInRange(day, day),
    deps.slots.list({ from: day, to: day }),
    deps.producers.listAll(),
  ]);
  return {
    date: day,
    today,
    shifts,
    slots,
    producers,
    summary: {
      onShift: shifts.filter((s) => s.kind === "live").length,
      office: shifts.filter((s) => s.kind === "office").length,
      away: shifts.filter((s) => s.kind === "off" || s.kind === "leave").length,
      lives: slots.length,
      ready: slots.filter(isStaffReady).length,
    },
    canEdit: user.role === "OPERATION" || user.role === "MANAGER",
  };
}

// Operation puts the Producer and Live Admins on a live. A live is "ready"
// once it has a Producer and a first Admin.
export async function assignStaff(
  deps: { slots: SlotRepository; producers: ProducerRepository },
  user: SessionUser,
  slotId: string,
  staff: SlotStaff,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (user.role !== "OPERATION" && user.role !== "MANAGER") {
    return { ok: false, error: "เฉพาะ Operation และ Manager เท่านั้นที่ลงทีมงานได้" };
  }
  const slot = await deps.slots.findById(slotId);
  if (!slot) return { ok: false, error: "ไม่พบสล็อตนี้" };
  if (slot.status === "completed") return { ok: false, error: "ไลฟ์นี้จบและบันทึกแล้ว" };

  const known = new Set((await deps.producers.listAll()).map((p) => p.id));
  const chosen = [staff.producerId, staff.admin1Id, staff.admin2Id].filter((id): id is string => !!id);
  if (chosen.some((id) => !known.has(id))) return { ok: false, error: "ไม่พบพนักงานที่เลือก" };
  if (new Set(chosen).size !== chosen.length) {
    return { ok: false, error: "คนเดียวกันเป็นทั้ง Producer และ Admin ในไลฟ์เดียวกันไม่ได้" };
  }
  if (!staff.admin1Id && staff.admin2Id) return { ok: false, error: "กรุณาเลือก Admin 1 ก่อน Admin 2" };

  await deps.slots.withDatesLocked([slot.date], (session) => session.setStaff(slotId, staff));
  return { ok: true };
}

// ---- Week and month views: one row per person, one column per day.

export interface GridPerson {
  producerId: string;
  name: string;
  position: string;
  squad: string;
}

export interface DayTotals {
  live: number; // people on a live shift
  office: number;
  away: number; // off or on leave
  lives: number;
  notReady: number;
}

export interface StaffGridData {
  view: "week" | "month";
  date: string;
  from: string;
  to: string;
  today: string;
  days: string[];
  people: GridPerson[];
  // producerId → date → shift code, and how many lives they staff that day
  codes: Record<string, Record<string, string>>;
  assigned: Record<string, Record<string, number>>;
  totals: Record<string, DayTotals>;
  canEdit: boolean;
}

const POSITION_RANK: Record<string, number> = {
  "Producer Team Lead": 0,
  "Senior Producer": 1,
  Producer: 2,
  "Jr. Producer": 3,
};

function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function getStaffGrid(
  deps: { shifts: ShiftRepository; slots: SlotRepository; producers: ProducerRepository; clock: Clock },
  user: SessionUser,
  query: { view: "week" | "month"; date: string | null; from: string; to: string },
): Promise<StaffGridData> {
  const { from, to } = query;
  const [shifts, slots, producers] = await Promise.all([
    deps.shifts.listInRange(from, to),
    deps.slots.list({ from, to }),
    deps.producers.listAll(),
  ]);
  const days = daysBetween(from, to);

  const codes: StaffGridData["codes"] = {};
  const assigned: StaffGridData["assigned"] = {};
  const totals: Record<string, DayTotals> = Object.fromEntries(
    days.map((d) => [d, { live: 0, office: 0, away: 0, lives: 0, notReady: 0 }]),
  );
  const involved = new Set<string>();

  for (const s of shifts) {
    involved.add(s.producerId);
    (codes[s.producerId] ??= {})[s.date] = s.code || (s.kind === "live" ? "•" : s.kind);
    const t = totals[s.date];
    if (s.kind === "live") t.live++;
    else if (s.kind === "office") t.office++;
    else t.away++;
  }
  for (const slot of slots) {
    const t = totals[slot.date];
    t.lives++;
    if (!isStaffReady(slot)) t.notReady++;
    for (const id of new Set([slot.producerId, slot.admin1Id, slot.admin2Id])) {
      if (!id) continue;
      involved.add(id);
      const mine = (assigned[id] ??= {});
      mine[slot.date] = (mine[slot.date] ?? 0) + 1;
    }
  }

  const people = producers
    .filter((p) => involved.has(p.id))
    .map((p) => ({ producerId: p.id, name: p.name, position: p.position, squad: p.squad }))
    .sort(
      (a, b) =>
        (POSITION_RANK[a.position] ?? 9) - (POSITION_RANK[b.position] ?? 9) ||
        a.squad.localeCompare(b.squad) ||
        a.name.localeCompare(b.name),
    );

  return {
    view: query.view,
    date: query.date ?? deps.clock.today(),
    from,
    to,
    today: deps.clock.today(),
    days,
    people,
    codes,
    assigned,
    totals,
    canEdit: user.role === "OPERATION" || user.role === "MANAGER",
  };
}
