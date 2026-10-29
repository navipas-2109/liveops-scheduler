import type { SessionUser } from "../auth/login";
import { fromLiveMinutes } from "@/domain/time";
import type { ApprovalStatus, Notifier, PaymentRepository } from "../ports";

const NEXT: Partial<Record<ApprovalStatus, ApprovalStatus>> = {
  pending: "approved",
  approved: "locked",
};

// Manager moves a payment pending → approved (Finance is notified), then
// approved → locked. Neither step can be undone here.
export async function advancePayment(
  deps: { payments: PaymentRepository; notifier: Notifier },
  user: SessionUser,
  paymentId: string,
  to: "approved" | "locked",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (user.role !== "MANAGER") return { ok: false, error: "เฉพาะ Manager เท่านั้นที่อนุมัติได้" };
  const payment = await deps.payments.findById(paymentId);
  if (!payment) return { ok: false, error: "ไม่พบรายการนี้" };
  const from = payment.approvalStatus;
  if (NEXT[from] !== to) return { ok: false, error: "สถานะรายการเปลี่ยนไปแล้ว กรุณารีเฟรช" };

  const moved = await deps.payments.advance(paymentId, from, to, user.userId);
  if (!moved) return { ok: false, error: "สถานะรายการเปลี่ยนไปแล้ว กรุณารีเฟรช" };

  if (to === "approved") {
    const r = payment.row;
    await deps.notifier.notify(
      ["finance"],
      `✅ อนุมัติค่า MC แล้ว\nMC ${r.mc.nickname} · ${r.brandName} (${r.platform})\n` +
        `${r.date} ${fromLiveMinutes(payment.actualStart)}–${fromLiveMinutes(payment.actualEnd)}\n` +
        `ยอดจ่าย ฿${payment.finalPay.toLocaleString("en-US")} (OT ฿${payment.otPay.toLocaleString("en-US")})\nโดย ${user.name}`,
    );
  }
  return { ok: true };
}
