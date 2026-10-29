// Display helpers shared by pages. Dates are "YYYY-MM-DD" strings.

import type { SlotStatus } from "@/domain/slot-rules";
import { fromLiveMinutes, LIVE_DAY_END, LIVE_DAY_START } from "@/domain/time";

// Fixed Thai names instead of Intl: the server and browsers ship different
// Thai locale data, which would make server and client text disagree.
const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const WEEKDAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const parts = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};

export const monthLabel = (month: string) => {
  const { y, m } = parts(`${month}-01`);
  return `${MONTHS[m - 1]} ${y}`;
};
export const shortDateLabel = (date: string) => {
  const { m, d } = parts(date);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
};
export const dayLabel = (date: string) =>
  `${WEEKDAYS_SHORT[parts(date).weekday]} ${shortDateLabel(date)}`;

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export const timeRange = (start: number, end: number) =>
  `${fromLiveMinutes(start)}–${fromLiveMinutes(end)}`;

// Half-hour choices from 07:00 to 02:00 the next morning.
export const TIME_CHOICES: number[] = [];
for (let m = LIVE_DAY_START; m <= LIVE_DAY_END; m += 30) TIME_CHOICES.push(m);

// Labels follow the prototype; colours are the dark-theme versions.
export const STATUS_META: Record<SlotStatus, { label: string; className: string; dot: string }> = {
  empty: { label: "ว่าง", className: "bg-line text-soft", dot: "bg-muted" },
  waiting: { label: "รอ MC", className: "bg-waiting-bg text-waiting-fg", dot: "bg-waiting-fg" },
  confirmed: { label: "ยืนยันแล้ว", className: "bg-confirmed-bg text-confirmed-fg", dot: "bg-confirmed-fg" },
  conflict: { label: "ชน", className: "bg-conflict-bg text-conflict-fg", dot: "bg-conflict-fg" },
  completed: { label: "เสร็จแล้ว", className: "bg-completed-bg text-completed-fg", dot: "bg-completed-fg" },
};

export const STATUS_ORDER: SlotStatus[] = ["waiting", "confirmed", "conflict", "completed"];
