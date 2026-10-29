import type { SessionUser } from "../auth/login";
import type { BookingWindow } from "@/domain/booking";
import { isValidIsoDate } from "@/domain/time";
import type { BookingWindowRepository } from "../ports";

// Planners and Managers decide when AEs may book each month.
export async function saveBookingWindow(
  deps: { bookingWindows: BookingWindowRepository },
  user: SessionUser,
  window: BookingWindow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (user.role !== "PLANNER" && user.role !== "MANAGER") {
    return { ok: false, error: "เฉพาะ Planner และ Manager เท่านั้นที่ตั้ง Booking Window ได้" };
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(window.targetMonth)) {
    return { ok: false, error: "เดือนเป้าหมายไม่ถูกต้อง" };
  }
  if (!isValidIsoDate(window.openFrom) || !isValidIsoDate(window.openTo)) {
    return { ok: false, error: "วันที่เปิด/ปิดไม่ถูกต้อง" };
  }
  if (window.openFrom > window.openTo) return { ok: false, error: "วันเปิดต้องไม่หลังวันปิด" };
  await deps.bookingWindows.save({ ...window, note: window.note.trim().slice(0, 200) }, user.userId);
  return { ok: true };
}
