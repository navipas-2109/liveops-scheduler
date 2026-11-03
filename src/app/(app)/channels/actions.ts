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

const ids = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 500) : []);
const text = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function editChannelAction(id: string, brandName: string, platform: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.editChannel(user, String(id), String(brandName ?? ""), String(platform ?? ""));
  if (result.ok) refresh();
  return result;
}

export async function updateChannelsAction(selected: string[], patch: { brandName?: string; platform?: string }) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.updateChannels(user, ids(selected), {
    brandName: text(patch?.brandName),
    platform: text(patch?.platform),
  });
  if (result.ok) refresh();
  return result;
}

export async function deleteChannelsAction(selected: string[]) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.deleteChannels(user, ids(selected));
  if (result.ok) refresh();
  return result;
}
