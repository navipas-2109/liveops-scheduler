// MC payment rules. Runs on the server only; the client just displays results.

export type RateType = "per_slot" | "per_hour";
export type LateReason = "normal" | "late" | "technical";

export interface PaymentInput {
  plannedStart: number; // live-day minutes
  plannedEnd: number;
  actualStart: number;
  actualEnd: number;
  lateReason: LateReason;
  rateType: RateType;
  rate: number; // THB per slot or per hour
}

export interface PaymentResult {
  plannedMin: number;
  actualMin: number;
  lateMin: number;
  otMin: number;
  basePay: number;
  deduction: number;
  otPay: number;
  finalPay: number;
}

const OT_MULTIPLIER = 1.5;

export function calculatePayment(input: PaymentInput): PaymentResult {
  const plannedMin = input.plannedEnd - input.plannedStart;
  const actualMin = input.actualEnd - input.actualStart;
  if (plannedMin <= 0) throw new Error("Slot end must be after slot start");
  if (actualMin <= 0) throw new Error("Actual end must be after actual start");

  const lateMin = Math.max(0, input.actualStart - input.plannedStart);
  const otMin = Math.max(0, input.actualEnd - input.plannedEnd);

  const ratePerMin =
    input.rateType === "per_slot" ? input.rate / plannedMin : input.rate / 60;
  const basePay =
    input.rateType === "per_slot" ? input.rate : Math.round(ratePerMin * plannedMin);
  // Only the MC's own lateness is deducted; "technical" delays are paid in full.
  const deduction = input.lateReason === "late" ? Math.round(ratePerMin * lateMin) : 0;
  // Overtime is always paid, and charged to the Business Unit.
  const otPay = Math.round(ratePerMin * otMin * OT_MULTIPLIER);

  return {
    plannedMin,
    actualMin,
    lateMin,
    otMin,
    basePay,
    deduction,
    otPay,
    finalPay: basePay - deduction + otPay,
  };
}
