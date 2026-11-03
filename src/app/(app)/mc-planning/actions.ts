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

export async function respondToSlotAction(slotId: string, response: "confirm" | "unconfirm" | "remove"): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!["confirm", "unconfirm", "remove"].includes(response)) return { ok: false, error: "คำสั่งไม่ถูกต้อง" };
  const result = await services.respondToSlot(user, String(slotId), response);
  if (result.ok) refresh();
  return result;
}
