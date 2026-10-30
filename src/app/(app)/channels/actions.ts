"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

const SIGNED_OUT = { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };

export async function addChannelAction(brandName: string, platform: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.addChannel(user, String(brandName ?? ""), String(platform ?? ""));
  if (result.ok) refresh();
  return result;
}

export async function deleteChannelAction(id: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.deleteChannel(user, String(id));
  if (result.ok) refresh();
  return result;
}
