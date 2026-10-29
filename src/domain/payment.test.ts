import { describe, expect, it } from "vitest";
import { calculatePayment, type PaymentInput } from "./payment";
import { toLiveMinutes as t } from "./time";

const exclusive = { rateType: "per_slot", rate: 8000 } as const;
const freelance = { rateType: "per_hour", rate: 4000 } as const;

function slot(start: string, end: string, actualStart: string, actualEnd: string) {
  return {
    plannedStart: t(start),
    plannedEnd: t(end),
    actualStart: t(actualStart),
    actualEnd: t(actualEnd),
  };
}

describe("calculatePayment", () => {
  it("per-slot MC late 5 min loses a pro-rata share", () => {
    const r = calculatePayment({
      ...slot("14:00", "16:00", "14:05", "16:00"),
      lateReason: "late",
      ...exclusive,
    });
    expect(r).toMatchObject({ basePay: 8000, deduction: 333, otPay: 0, finalPay: 7667 });
  });

  it("per-slot overtime is paid at 1.5x", () => {
    const r = calculatePayment({
      ...slot("18:00", "20:00", "18:00", "20:30"),
      lateReason: "normal",
      ...exclusive,
    });
    expect(r).toMatchObject({ otMin: 30, otPay: 3000, finalPay: 11000 });
  });

  it("technical delay is not deducted", () => {
    const r = calculatePayment({
      ...slot("10:00", "12:00", "10:15", "12:00"),
      lateReason: "technical",
      ...freelance,
    });
    expect(r).toMatchObject({ lateMin: 15, basePay: 8000, deduction: 0, finalPay: 8000 });
  });

  it("per-hour MC late is deducted by the minute", () => {
    const r = calculatePayment({
      ...slot("10:00", "12:00", "10:10", "12:00"),
      lateReason: "late",
      ...freelance,
    });
    expect(r).toMatchObject({ deduction: 667, finalPay: 7333 });
  });

  it("handles a slot that runs past midnight", () => {
    const r = calculatePayment({
      ...slot("23:00", "01:00", "23:00", "01:30"),
      lateReason: "normal",
      ...freelance,
    });
    expect(r).toMatchObject({ plannedMin: 120, basePay: 8000, otMin: 30, otPay: 3000 });
  });

  it("rejects an actual end before the actual start", () => {
    const input: PaymentInput = {
      ...slot("10:00", "12:00", "12:00", "10:00"),
      lateReason: "normal",
      ...freelance,
    };
    expect(() => calculatePayment(input)).toThrow();
  });
});
