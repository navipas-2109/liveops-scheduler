import type { SessionUser } from "../auth/login";
import { calculatePayment, type LateReason } from "@/domain/payment";
import { liveHasEnded, LIVE_DAY_END, LIVE_DAY_START } from "@/domain/time";
import type { Clock, PaymentRepository } from "../ports";

export interface RecordInput {
  slotId: string;
  actualStart: number; // live-day minutes
  actualEnd: number;
  lateReason: LateReason;
  note: string;
}

const LATE_REASONS: LateReason[] = ["normal", "late", "technical"];
// Actual times may run a little outside the bookable 07:00–02:00 range.
const EARLIEST = LIVE_DAY_START - 60;
const LATEST = LIVE_DAY_END + 4 * 60;

// Operation records what actually happened after a live. Pay is always
// calculated here from the MC's current rate, never taken from the browser.
export async function recordPayment(
  deps: { payments: PaymentRepository; clock: Clock },
  user: SessionUser,
  input: RecordInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (user.role !== "OPERATION" && user.role !== "MANAGER") {
    return { ok: false, error: "เฉพาะ Operation และ Manager เท่านั้นที่บันทึกเวลาไลฟ์ได้" };
  }
  const { actualStart, actualEnd } = input;
  if (!Number.isInteger(actualStart) || !Number.isInteger(actualEnd)) {
    return { ok: false, error: "เวลาไม่ถูกต้อง" };
  }
  if (actualStart < EARLIEST || actualEnd > LATEST) return { ok: false, error: "เวลาอยู่นอกช่วงวันไลฟ์" };
  if (actualEnd <= actualStart) return { ok: false, error: "เวลาจบจริงต้องหลังเวลาเริ่มจริง" };
  if (!LATE_REASONS.includes(input.lateReason)) return { ok: false, error: "เหตุผลไม่ถูกต้อง" };

  const row = await deps.payments.findRow(input.slotId);
  if (!row) return { ok: false, error: "ไม่พบสล็อตนี้ หรือสล็อตยังไม่มี MC" };
  if (row.payment && row.payment.approvalStatus !== "pending") {
    return { ok: false, error: "รายการนี้อนุมัติแล้ว แก้ไขไม่ได้" };
  }
  if (!row.payment) {
    if (row.slotStatus !== "confirmed") {
      return { ok: false, error: "บันทึกได้เฉพาะสล็อตที่ยืนยัน MC แล้วและไม่มีคิวชน" };
    }
    if (!liveHasEnded(row, { date: deps.clock.today(), minute: deps.clock.nowMinute() })) {
      return { ok: false, error: "ไลฟ์นี้ยังไม่จบตามเวลาในตาราง" };
    }
  }

  const pay = calculatePayment({
    plannedStart: row.startMinute,
    plannedEnd: row.endMinute,
    actualStart,
    actualEnd,
    lateReason: input.lateReason,
    rateType: row.mc.rateType,
    rate: row.mc.rate,
  });
  const saved = await deps.payments.record(
    row.slotId,
    {
      actualStart,
      actualEnd,
      lateReason: input.lateReason,
      note: input.note.trim().slice(0, 300),
      basePay: pay.basePay,
      deduction: pay.deduction,
      otPay: pay.otPay,
      finalPay: pay.finalPay,
    },
    user.userId,
  );
  return saved ? { ok: true } : { ok: false, error: "รายการนี้เพิ่งถูกอนุมัติ แก้ไขไม่ได้แล้ว" };
}

// "Ran exactly as scheduled": records the planned times as the actual times.
export async function recordOnTime(
  deps: { payments: PaymentRepository; clock: Clock },
  user: SessionUser,
  slotId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await deps.payments.findRow(slotId);
  if (!row) return { ok: false, error: "ไม่พบสล็อตนี้ หรือสล็อตยังไม่มี MC" };
  return recordPayment(deps, user, {
    slotId,
    actualStart: row.startMinute,
    actualEnd: row.endMinute,
    lateReason: "normal",
    note: "",
  });
}
