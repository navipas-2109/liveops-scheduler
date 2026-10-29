"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import type { LateReason } from "@/domain/payment";
import { getSessionUser } from "@/infrastructure/auth/session";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type BulkResult = { done: number; errors: string[] };

const SIGNED_OUT: ActionResult = { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
const MAX_BULK = 200;

export async function recordPaymentAction(input: {
  slotId: string;
  actualStart: number;
  actualEnd: number;
  lateReason: LateReason;
  note: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.recordPayment(user, {
    slotId: String(input.slotId),
    actualStart: Number(input.actualStart),
    actualEnd: Number(input.actualEnd),
    lateReason: String(input.lateReason) as LateReason,
    note: String(input.note ?? ""),
  });
  if (result.ok) refresh();
  return result;
}

// One click for lives that ran exactly as scheduled: actual = planned.
export async function recordOnTimeAction(slotIds: string[]): Promise<BulkResult> {
  const user = await getSessionUser();
  if (!user) return { done: 0, errors: ["กรุณาเข้าสู่ระบบใหม่"] };
  const result: BulkResult = { done: 0, errors: [] };
  for (const id of slotIds.slice(0, MAX_BULK)) {
    const r = await services.recordOnTime(user, String(id));
    if (r.ok) result.done++;
    else result.errors.push(r.error);
  }
  if (result.done > 0) refresh();
  return result;
}

export async function advancePaymentsAction(
  paymentIds: string[],
  to: "approved" | "locked",
): Promise<BulkResult> {
  const user = await getSessionUser();
  if (!user) return { done: 0, errors: ["กรุณาเข้าสู่ระบบใหม่"] };
  const result: BulkResult = { done: 0, errors: [] };
  for (const id of paymentIds.slice(0, MAX_BULK)) {
    const r = await services.advancePayment(user, String(id), to === "locked" ? "locked" : "approved");
    if (r.ok) result.done++;
    else result.errors.push(r.error);
  }
  if (result.done > 0) refresh();
  return result;
}
