import type { SessionUser } from "../auth/login";
import type { ShiftMonthInfo, ShiftMonthRepository } from "../ports";

const EDITORS = ["OPERATION", "PLANNER", "MANAGER"];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getShiftMonth(deps: { shiftMonths: ShiftMonthRepository }, month: string): Promise<ShiftMonthInfo | null> {
  return MONTH.test(month) ? deps.shiftMonths.find(month) : Promise.resolve(null);
}

// The Planner marks a month of shifts as final; undoing it allows importing again.
export async function setShiftMonthConfirmed(
  deps: { shiftMonths: ShiftMonthRepository },
  user: SessionUser,
  month: string,
  confirmed: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!EDITORS.includes(user.role)) return { ok: false, error: "คุณไม่มีสิทธิ์ยืนยันกะ" };
  if (!MONTH.test(month)) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  if (confirmed) await deps.shiftMonths.confirm(month, user.userId);
  else await deps.shiftMonths.unconfirm(month);
  return { ok: true };
}
