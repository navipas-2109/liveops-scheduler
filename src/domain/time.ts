// A live day runs from 06:00 until 05:59 the next morning, so a slot from
// 22:00 to 02:00 belongs to one date. Times are stored as "live-day minutes":
// minutes after 00:00 of the slot's date, with 00:00–05:59 counted as 24:00+.

const DAY_ROLLOVER_HOUR = 6;

export function toLiveMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) throw new Error(`Invalid time "${hhmm}", expected HH:MM`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59) throw new Error(`Invalid time "${hhmm}"`);
  // "24:00" means midnight, same as "00:00".
  const h = hours === 24 ? 0 : hours;
  return (h < DAY_ROLLOVER_HOUR ? h + 24 : h) * 60 + minutes;
}

export function fromLiveMinutes(liveMinutes: number): string {
  const h = Math.floor(liveMinutes / 60) % 24;
  const m = liveMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface TimeRange {
  startMinute: number;
  endMinute: number;
}

// Back-to-back slots (one ends 12:00, next starts 12:00) do not overlap.
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}
