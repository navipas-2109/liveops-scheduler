// Brand Slot Check: a brand's booked hours for the month against the
// Planner's plan, split into the team's time bands.

import { toLiveMinutes, type TimeRange } from "./time";

export const TIME_BANDS = [
  { label: "06:30–10:30", start: toLiveMinutes("06:30"), end: toLiveMinutes("10:30") },
  { label: "10:30–13:30", start: toLiveMinutes("10:30"), end: toLiveMinutes("13:30") },
  { label: "13:30–16:30", start: toLiveMinutes("13:30"), end: toLiveMinutes("16:30") },
  { label: "16:30–21:30", start: toLiveMinutes("16:30"), end: toLiveMinutes("21:30") },
  { label: "21:30–02:30", start: toLiveMinutes("21:30"), end: toLiveMinutes("02:30") },
];

// Minutes of the slots falling in each band (a live across a boundary is split).
export function bandMinutes(slots: TimeRange[]): number[] {
  return TIME_BANDS.map((b) =>
    slots.reduce((sum, s) => sum + Math.max(0, Math.min(s.endMinute, b.end) - Math.max(s.startMinute, b.start)), 0),
  );
}

export const totalMinutes = (slots: TimeRange[]) => slots.reduce((sum, s) => sum + s.endMinute - s.startMinute, 0);

export type CheckStatus = "no_plan" | "short" | "over" | "awaiting_approval" | "ready" | "confirmed";

// The order a brand moves through: Planner sets the plan, AE books until the
// hours match, Planner approves, AE confirms (locks).
export function checkStatus(s: {
  planMinutes: number | null;
  inputMinutes: number;
  approved: boolean;
  locked: boolean;
}): CheckStatus {
  if (s.locked) return "confirmed";
  if (s.planMinutes === null) return "no_plan";
  if (s.inputMinutes < s.planMinutes) return "short";
  if (s.inputMinutes > s.planMinutes) return "over";
  return s.approved ? "ready" : "awaiting_approval";
}

export const CHECK_MESSAGE: Record<Exclude<CheckStatus, "ready" | "confirmed">, string> = {
  no_plan: "ยังไม่มี Plan — รอ Planner ใส่จำนวนชั่วโมง",
  short: "ลงสล็อตยังไม่ครบจำนวนชั่วโมงตาม Plan",
  over: "ลงสล็อตเกินจำนวนชั่วโมงตาม Plan",
  awaiting_approval: "ชั่วโมงครบแล้ว — รอ Planner Approve ก่อนยืนยัน",
};
