import { beforeEach, describe, expect, it } from "vitest";
import { toLiveMinutes as t } from "@/domain/time";
import type { SessionUser } from "../auth/login";
import type { NotifyChannel, Payment, PaymentRepository, PaymentRow } from "../ports";
import { advancePayment } from "./approve-payment";
import { recordPayment, type RecordInput } from "./record-payment";

const operation: SessionUser = { userId: "op1", name: "Operation", role: "OPERATION" };
const manager: SessionUser = { userId: "m1", name: "Manager", role: "MANAGER" };
const ae: SessionUser = { userId: "ae1", name: "AE", role: "AE" };

function setup(nowDate = "2026-10-20", nowMinute = t("13:00")) {
  const rows: PaymentRow[] = [
    {
      slotId: "s1",
      date: "2026-10-20",
      startMinute: t("10:00"),
      endMinute: t("12:00"),
      brandName: "PUMA",
      platform: "TikTok",
      roomName: "Room 1",
      mc: { nickname: "NanJira", status: "Exclusive", rateType: "per_slot", rate: 8000 },
      slotStatus: "confirmed",
      payment: null,
    },
    {
      slotId: "s2",
      date: "2026-10-20",
      startMinute: t("14:00"),
      endMinute: t("16:00"),
      brandName: "PUMA",
      platform: "TikTok",
      roomName: "Room 1",
      mc: { nickname: "Napat", status: "Freelance", rateType: "per_hour", rate: 4000 },
      slotStatus: "confirmed",
      payment: null,
    },
  ];
  const sent: { channels: NotifyChannel[]; text: string }[] = [];
  const payments: PaymentRepository = {
    listRows: async () => rows,
    summary: async () => {
      throw new Error("unused");
    },
    findRow: async (id) => rows.find((r) => r.slotId === id) ?? null,
    findById: async (id) => {
      const row = rows.find((r) => r.payment?.id === id);
      return row ? { ...row.payment!, row } : null;
    },
    record: async (slotId, amounts) => {
      const row = rows.find((r) => r.slotId === slotId)!;
      if (row.payment && row.payment.approvalStatus !== "pending") return false;
      const payment: Payment = {
        id: `p-${slotId}`,
        slotId,
        ...amounts,
        approvalStatus: "pending",
        recordedByName: "Operation",
        approvedByName: null,
      };
      row.payment = payment;
      row.slotStatus = "completed";
      return true;
    },
    advance: async (id, from, to) => {
      const row = rows.find((r) => r.payment?.id === id);
      if (!row || row.payment!.approvalStatus !== from) return false;
      row.payment!.approvalStatus = to;
      return true;
    },
  };
  const deps = {
    payments,
    notifier: { notify: async (channels: NotifyChannel[], text: string) => void sent.push({ channels, text }) },
    clock: { today: () => nowDate, nowMinute: () => nowMinute },
  };
  return { deps, rows, sent };
}

const input = (o: Partial<RecordInput> = {}): RecordInput => ({
  slotId: "s1",
  actualStart: t("10:05"),
  actualEnd: t("12:30"),
  lateReason: "late",
  note: "",
  ...o,
});

describe("recordPayment", () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => {
    env = setup();
  });

  it("calculates pay on the server and completes the slot", async () => {
    expect(await recordPayment(env.deps, operation, input())).toEqual({ ok: true });
    const row = env.rows[0];
    // 8000 per 120 min: late 5 min → 333, OT 30 min × 1.5 → 3000
    expect(row.payment).toMatchObject({ basePay: 8000, deduction: 333, otPay: 3000, finalPay: 10667 });
    expect(row.slotStatus).toBe("completed");
  });

  it("refuses a live that hasn't ended yet", async () => {
    const r = await recordPayment(env.deps, operation, input({ slotId: "s2", actualStart: t("14:00"), actualEnd: t("16:00") }));
    expect(r).toEqual({ ok: false, error: "ไลฟ์นี้ยังไม่จบตามเวลาในตาราง" });
  });

  it("refuses AEs, bad times and approved payments", async () => {
    expect((await recordPayment(env.deps, ae, input())).ok).toBe(false);
    expect((await recordPayment(env.deps, operation, input({ actualEnd: t("10:00") }))).ok).toBe(false);
    await recordPayment(env.deps, operation, input());
    await advancePayment(env.deps, manager, "p-s1", "approved");
    expect(await recordPayment(env.deps, operation, input())).toEqual({
      ok: false,
      error: "รายการนี้อนุมัติแล้ว แก้ไขไม่ได้",
    });
  });

  it("lets Operation correct a pending payment", async () => {
    await recordPayment(env.deps, operation, input());
    await recordPayment(env.deps, operation, input({ actualStart: t("10:00"), actualEnd: t("12:00"), lateReason: "normal" }));
    expect(env.rows[0].payment).toMatchObject({ deduction: 0, otPay: 0, finalPay: 8000 });
  });
});

describe("advancePayment", () => {
  it("goes pending → approved → locked, only for Managers, and tells Finance", async () => {
    const env = setup();
    await recordPayment(env.deps, operation, input());
    expect((await advancePayment(env.deps, operation, "p-s1", "approved")).ok).toBe(false);
    expect((await advancePayment(env.deps, manager, "p-s1", "locked")).ok).toBe(false);
    expect(await advancePayment(env.deps, manager, "p-s1", "approved")).toEqual({ ok: true });
    expect(env.sent).toHaveLength(1);
    expect(env.sent[0].channels).toEqual(["finance"]);
    expect(env.sent[0].text).toContain("฿10,667");
    expect(await advancePayment(env.deps, manager, "p-s1", "locked")).toEqual({ ok: true });
    expect(env.rows[0].payment!.approvalStatus).toBe("locked");
  });
});

describe("recordOnTime", () => {
  it("uses the scheduled times from the database", async () => {
    const { recordOnTime } = await import("./record-payment");
    const env = setup();
    expect(await recordOnTime(env.deps, operation, "s1")).toEqual({ ok: true });
    expect(env.rows[0].payment).toMatchObject({ actualStart: t("10:00"), actualEnd: t("12:00"), finalPay: 8000 });
  });
});
