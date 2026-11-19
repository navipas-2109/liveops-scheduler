// Reads MC queue rows from the team's Google Sheet ("DEC X MC"): one live per
// row with MC, Brand, Channel, Date ("1 Dec"), Start / End ("7:30", "0:30").

import { fromIsoDate, toIsoDate, toLiveMinutes } from "./time";

export interface RawSheetRow {
  sheet: string;
  row: number;
  mc: string;
  brand: string;
  channel: string;
  date: string;
  start: string;
  end: string;
  note?: string;
  bu?: string;
}

export interface SheetQueueRow {
  key: string;
  mcName: string;
  brand: string;
  channel: string;
  date: string; // YYYY-MM-DD
  startMinute: number; // live-day minutes
  endMinute: number;
  note: string;
  bu: string;
  sheet: string;
  row: number;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();
export const mcKey = (name: string) => clean(name).toLowerCase();

function validDate(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? toIsoDate(date) : null;
}

// "1 Dec" has no year: take the year that puts it closest to today.
export function parseSheetDate(text: string, today: string): string | null {
  const t = clean(text).toLowerCase();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) return validDate(+m[3], +m[2], +m[1]);
  m = /^(\d{1,2})[\s-]*([a-z]{3})[a-z]*\.?(?:[\s-]*(\d{4}))?$/.exec(t);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]) + 1;
  if (!month) return null;
  if (m[3]) return validDate(+m[3], month, +m[1]);
  const year = +today.slice(0, 4);
  const now = fromIsoDate(today).getTime();
  const options = [year - 1, year, year + 1]
    .map((y) => validDate(y, month, +m![1]))
    .filter((d): d is string => !!d);
  options.sort((a, b) => Math.abs(fromIsoDate(a).getTime() - now) - Math.abs(fromIsoDate(b).getTime() - now));
  return options[0] ?? null;
}

export function parseSheetTime(text: string): number | null {
  const t = clean(text).replace(".", ":");
  if (!/^\d{1,2}:\d{2}$/.test(t)) return null;
  try {
    return toLiveMinutes(t);
  } catch {
    return null;
  }
}

export function parseSheetRows(
  rows: RawSheetRow[],
  today: string,
): { queues: SheetQueueRow[]; skipped: { sheet: string; row: number; reason: string }[] } {
  const queues: SheetQueueRow[] = [];
  const skipped: { sheet: string; row: number; reason: string }[] = [];
  const seen = new Map<string, number>();
  for (const r of rows) {
    const mcName = clean(r.mc);
    const brand = clean(r.brand);
    if (!mcName && !brand) continue; // empty row
    const skip = (reason: string) => skipped.push({ sheet: r.sheet, row: r.row, reason });
    if (!mcName) {
      skip("ยังไม่มี MC");
      continue;
    }
    const date = parseSheetDate(r.date, today);
    if (!date) {
      skip(`วันที่อ่านไม่ได้: "${r.date}"`);
      continue;
    }
    const start = parseSheetTime(r.start);
    let end = parseSheetTime(r.end);
    if (start === null || end === null) {
      skip(`เวลาอ่านไม่ได้: "${r.start}–${r.end}"`);
      continue;
    }
    if (end <= start) end += 24 * 60;
    const channel = clean(r.channel);
    // Same MC, brand, channel and time twice in a sheet: keep both, numbered.
    const base = [mcKey(mcName), brand.toLowerCase(), channel.toLowerCase(), date, start, end].join("|");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    queues.push({
      key: n === 1 ? base : `${base}#${n}`,
      mcName,
      brand,
      channel,
      date,
      startMinute: start,
      endMinute: end,
      note: clean(r.note),
      bu: clean(r.bu),
      sheet: clean(r.sheet),
      row: r.row,
    });
  }
  return { queues, skipped };
}
