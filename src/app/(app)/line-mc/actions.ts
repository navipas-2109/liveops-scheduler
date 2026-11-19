"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

const SIGNED_OUT = { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };

export async function resetLineLinkAction(mcName: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const r = await services.resetLineLink(user, String(mcName));
  if (r.ok) refresh();
  return r;
}

export async function remindMcsAction() {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  return services.remindMcs(user);
}
