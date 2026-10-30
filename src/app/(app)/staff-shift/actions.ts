"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

const SIGNED_OUT = { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
const MAX_PASTE = 500_000; // characters; a month of ~150 people is far less

export async function previewImportAction(month: string, text: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  if (String(text).length > MAX_PASTE) return { ok: false as const, error: "ข้อมูลที่วางยาวเกินไป" };
  return services.previewShiftImport(user, { month: String(month), text: String(text) });
}

export async function importShiftsAction(month: string, text: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  if (String(text).length > MAX_PASTE) return { ok: false as const, error: "ข้อมูลที่วางยาวเกินไป" };
  const result = await services.importShifts(user, { month: String(month), text: String(text) });
  if (result.ok) refresh();
  return result;
}
