// Booking Window rules: AEs may only add or change slots for a target month
// while that month's window is open. Other roles are not limited by windows.

import type { Role } from "./roles";

export interface BookingWindow {
  targetMonth: string; // "2026-08"
  openFrom: string; // "2026-07-01", inclusive
  openTo: string; // "2026-07-15", inclusive
  note: string;
}

// Dates are compared as "YYYY-MM-DD" strings, which sort correctly.
export function isWindowOpen(window: BookingWindow, today: string): boolean {
  return window.openFrom <= today && today <= window.openTo;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export type BookingCheck = { ok: true } | { ok: false; reason: string };

export function checkBookingAllowed(
  role: Role,
  windows: BookingWindow[],
  slotDate: string,
  today: string,
): BookingCheck {
  if (role !== "AE") return { ok: true };

  const window = windows.find((w) => w.targetMonth === monthOf(slotDate));
  if (!window) {
    return { ok: false, reason: `ยังไม่มี Booking Window สำหรับเดือน ${monthOf(slotDate)}` };
  }
  if (!isWindowOpen(window, today)) {
    return {
      ok: false,
      reason: `Booking Window เดือน ${window.targetMonth} เปิดเฉพาะ ${window.openFrom} ถึง ${window.openTo}`,
    };
  }
  return { ok: true };
}

// The window shown in the banner: one open today, otherwise the next upcoming one.
export function currentWindow(windows: BookingWindow[], today: string): BookingWindow | null {
  const open = windows.find((w) => isWindowOpen(w, today));
  if (open) return open;
  const upcoming = windows
    .filter((w) => w.openFrom > today)
    .sort((a, b) => a.openFrom.localeCompare(b.openFrom));
  return upcoming[0] ?? null;
}
