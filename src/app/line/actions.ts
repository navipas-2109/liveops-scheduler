"use server";

import { services } from "@/di/container";

// Every call carries the LIFF ID token; LINE confirms who the MC is.
async function lineUser(idToken: string) {
  return typeof idToken === "string" && idToken ? services.verifyLineUser(idToken) : null;
}
const EXPIRED = { ok: false as const, error: "เซสชัน LINE หมดอายุ — ปิดแล้วเปิดหน้านี้ใหม่" };

export async function myQueueAction(idToken: string) {
  const user = await lineUser(idToken);
  if (!user) return EXPIRED;
  return { ok: true as const, value: await services.getMyQueue(user) };
}

export async function linkAction(idToken: string, code: string) {
  const user = await lineUser(idToken);
  if (!user) return EXPIRED;
  return services.linkMyLine(user, String(code ?? "").slice(0, 20));
}

export async function answerAction(idToken: string, keys: string[], status: "confirmed" | "declined", reason: string) {
  const user = await lineUser(idToken);
  if (!user) return EXPIRED;
  if (status !== "confirmed" && status !== "declined") return { ok: false as const, error: "คำสั่งไม่ถูกต้อง" };
  const list = Array.isArray(keys) ? keys.map(String).slice(0, 500) : [];
  return services.answerMyQueues(user, list, status, String(reason ?? ""));
}
