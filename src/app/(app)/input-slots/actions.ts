"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

export async function setBrandLockAction(brandId: string, month: string, locked: boolean) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await services.setBrandLock(user, String(brandId), String(month), locked === true);
  if (result.ok) refresh();
  return result;
}

export async function closePdTimeAction(input: {
  producerIds: string[];
  from: string;
  to: string;
  startMinute: number;
  endMinute: number;
  note: string;
}) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await services.closePdTime(user, {
    producerIds: Array.isArray(input.producerIds) ? input.producerIds.map(String).slice(0, 200) : [],
    from: String(input.from ?? ""),
    to: String(input.to ?? ""),
    startMinute: Number(input.startMinute),
    endMinute: Number(input.endMinute),
    note: String(input.note ?? ""),
  });
  if (result.ok) refresh();
  return result;
}

export async function reopenPdTimeAction(ids: string[]) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await services.reopenPdTime(user, Array.isArray(ids) ? ids.map(String) : []);
  if (result.ok) refresh();
  return result;
}
