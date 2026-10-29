"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import type { BookingWindow } from "@/domain/booking";
import { getSessionUser } from "@/infrastructure/auth/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveBookingWindowAction(window: BookingWindow): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await services.saveBookingWindow(user, {
    targetMonth: String(window.targetMonth ?? ""),
    openFrom: String(window.openFrom ?? ""),
    openTo: String(window.openTo ?? ""),
    note: String(window.note ?? ""),
  });
  if (result.ok) refresh();
  return result;
}
