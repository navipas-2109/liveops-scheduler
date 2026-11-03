"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

const SIGNED_OUT = { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };

export async function setPlanAction(brandId: string, month: string, hours: number, remark: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.setPlan(user, String(brandId), String(month), Number(hours), String(remark ?? ""));
  if (result.ok) refresh();
  return result;
}

export async function approvePlanAction(brandId: string, month: string, approve: boolean) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.approvePlan(user, String(brandId), String(month), approve === true);
  if (result.ok) refresh();
  return result;
}

export async function confirmReadyAction(month: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.confirmReady(user, String(month));
  if (result.ok) refresh();
  return result;
}
