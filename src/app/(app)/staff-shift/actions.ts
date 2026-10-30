"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

const SIGNED_OUT = { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
const MAX_PASTE = 500_000; // characters; a month of ~150 people is far less

const idOrNull = (v: unknown) => (typeof v === "string" && v ? v : null);

export async function assignStaffAction(
  slotId: string,
  staff: { producerId: string | null; admin1Id: string | null; admin2Id: string | null },
) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.assignStaff(user, String(slotId), {
    producerId: idOrNull(staff.producerId),
    admin1Id: idOrNull(staff.admin1Id),
    admin2Id: idOrNull(staff.admin2Id),
  });
  if (result.ok) refresh();
  return result;
}

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
