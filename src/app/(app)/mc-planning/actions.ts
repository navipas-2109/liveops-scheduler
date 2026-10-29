"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function assignMcAction(slotId: string, mcId: string | null): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await services.assignMc(user, String(slotId), mcId ? String(mcId) : null);
  if (result.ok) refresh();
  return result;
}

export async function busyMcsAction(slotId: string) {
  const user = await getSessionUser();
  if (!user) return {};
  return services.getBusyMcs(String(slotId));
}
