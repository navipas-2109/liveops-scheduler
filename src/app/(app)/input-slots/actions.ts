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
