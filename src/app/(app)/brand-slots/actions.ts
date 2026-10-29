"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import type { BookingWindow } from "@/domain/booking";
import { getSessionUser } from "@/infrastructure/auth/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface SlotFormValues {
  id?: string;
  date: string;
  startMinute: number;
  endMinute: number;
  roomId: string;
  brandId: string;
  campaign: string;
  requirement: string;
}

const SIGNED_OUT: ActionResult = { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

// Server actions can be called with any arguments, so coerce before use.
function clean(v: SlotFormValues) {
  return {
    date: String(v.date ?? ""),
    startMinute: Number(v.startMinute),
    endMinute: Number(v.endMinute),
    roomId: String(v.roomId ?? ""),
    brandId: String(v.brandId ?? ""),
    campaign: String(v.campaign ?? ""),
    requirement: String(v.requirement ?? ""),
  };
}

export async function saveSlotAction(values: SlotFormValues): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.saveSlot(user, clean(values), values.id ? String(values.id) : undefined);
  if (!result.ok) return result;
  refresh();
  return { ok: true };
}

export async function deleteSlotAction(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.deleteSlot(user, String(id));
  if (result.ok) refresh();
  return result;
}

export async function checkRoomAction(query: {
  date: string;
  roomId: string;
  startMinute: number;
  endMinute: number;
  excludeId?: string;
}) {
  const user = await getSessionUser();
  if (!user) return [];
  const q = clean({ ...query, brandId: "", campaign: "", requirement: "" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.date) || !(q.endMinute > q.startMinute)) return [];
  return services.checkRoomAvailability({
    date: q.date,
    roomId: q.roomId,
    startMinute: q.startMinute,
    endMinute: q.endMinute,
    excludeId: query.excludeId ? String(query.excludeId) : undefined,
  });
}

export async function saveBookingWindowAction(window: BookingWindow): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.saveBookingWindow(user, {
    targetMonth: String(window.targetMonth ?? ""),
    openFrom: String(window.openFrom ?? ""),
    openTo: String(window.openTo ?? ""),
    note: String(window.note ?? ""),
  });
  if (result.ok) refresh();
  return result;
}
