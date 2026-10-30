// Date ranges for the week and month views.

import { fromIsoDate, toIsoDate } from "@/domain/time";
import { monthRange } from "./get-brand-slot-page";

export type RangeView = "month" | "week" | "day";

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

export function rangeFor(view: RangeView, date: string): { from: string; to: string } {
  if (view === "day") return { from: date, to: date };
  if (view === "week") {
    const from = weekStart(date);
    return { from, to: addDays(from, 6) };
  }
  return monthRange(date.slice(0, 7));
}
