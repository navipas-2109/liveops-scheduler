"use client";

import { CheckCheck, ChevronLeft, ChevronRight, Lock, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { PaymentPageData, PaymentTab } from "@/application/payments/get-payment-page";
import type { PaymentRow } from "@/application/ports";
import { calculatePayment } from "@/domain/payment";
import { fromLiveMinutes } from "@/domain/time";
import {
  APPROVAL_META,
  baht,
  dayLabel,
  LATE_REASON_LABEL,
  monthLabel,
  shiftMonth,
  timeRange,
} from "../../format";
import { advancePaymentsAction, recordOnTimeAction } from "./actions";
import { RecordDrawer } from "./record-drawer";

const TABS: { id: PaymentTab; label: string }[] = [
  { id: "toRecord", label: "รอบันทึก" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "locked", label: "Locked" },
  { id: "all", label: "ทั้งหมด" },
];

// Pay a row would get if the live ran exactly on schedule.
function onTimeEstimate(row: PaymentRow) {
  return calculatePayment({
    plannedStart: row.startMinute,
    plannedEnd: row.endMinute,
    actualStart: row.startMinute,
    actualEnd: row.endMinute,
    lateReason: "normal",
    rateType: row.mc.rateType,
    rate: row.mc.rate,
  }).finalPay;
}

export function PaymentView({ data }: { data: PaymentPageData }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: "onTime" | "approved" | "locked"; rows: PaymentRow[] }>(null);
  const [message, setMessage] = useState<string | null>(null);

  const href = (month: string, tab: PaymentTab) => `?month=${month}&tab=${tab}`;
  const rowKey = (r: PaymentRow) => r.slotId;
  const selectedRows = data.rows.filter((r) => selected.has(rowKey(r)));

  // What a Manager or Operation can do in bulk depends on the tab.
  const bulk =
    data.tab === "toRecord" && data.canRecord
      ? { kind: "onTime" as const, label: "บันทึกตรงเวลา", icon: CheckCheck }
      : data.tab === "pending" && data.canApprove
        ? { kind: "approved" as const, label: "อนุมัติ", icon: CheckCheck }
        : data.tab === "approved" && data.canApprove
          ? { kind: "locked" as const, label: "Lock", icon: Lock }
          : null;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function runConfirmed() {
    if (!confirm) return;
    const result =
      confirm.kind === "onTime"
        ? await recordOnTimeAction(confirm.rows.map((r) => r.slotId))
        : await advancePaymentsAction(
            confirm.rows.map((r) => r.payment!.id),
            confirm.kind,
          );
    setConfirm(null);
    setSelected(new Set());
    setMessage(
      `สำเร็จ ${result.done} รายการ` +
        (result.errors.length ? ` · ไม่สำเร็จ ${result.errors.length}: ${[...new Set(result.errors)].join(", ")}` : ""),
    );
  }

  const s = data.summary;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="รอบันทึกเวลาจริง" value={`${s.toRecord} สล็อต`} tone="text-soft" />
        <SummaryCard label="Pending (รออนุมัติ)" value={baht(s.pending.total)} sub={`${s.pending.count} รายการ`} tone="text-waiting-fg" />
        <SummaryCard
          label="Approved + Locked"
          value={baht(s.approved.total + s.locked.total)}
          sub={`${s.approved.count + s.locked.count} รายการ`}
          tone="text-confirmed-fg"
        />
        <SummaryCard label="ค่า OT ทั้งเดือน (BU)" value={baht(s.otTotal)} tone="text-accent" />
      </div>

      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={href(data.month, t.id)}
                onClick={() => setSelected(new Set())}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  data.tab === t.id ? "bg-primary/15 text-accent" : "text-muted hover:bg-field hover:text-soft"
                }`}
              >
                {t.label}
                {t.id === "toRecord" && s.toRecord > 0 && (
                  <span className="ml-1.5 rounded-full bg-waiting-bg px-1.5 text-[10px] text-waiting-fg">{s.toRecord}</span>
                )}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Link href={href(shiftMonth(data.month, -1), data.tab)} aria-label="เดือนก่อน" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
              <ChevronLeft size={14} />
            </Link>
            <span className="min-w-[120px] text-center text-xs font-semibold">{monthLabel(data.month)}</span>
            <Link href={href(shiftMonth(data.month, 1), data.tab)} aria-label="เดือนถัดไป" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {data.tab === "toRecord" && data.canRecord && (
          <p className="border-b border-line bg-field/60 px-4 py-2 text-[11px] text-soft">
            สล็อตที่ยืนยัน MC แล้วและเลยเวลาจบ จะขึ้นที่นี่อัตโนมัติ — ไลฟ์ตรงเวลาให้เลือกแล้วกด “บันทึกตรงเวลา”, ถ้าสายหรือเกินเวลาให้กด ✎ เพื่อแก้เวลาจริง
          </p>
        )}

        {bulk && data.rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
            <label className="flex items-center gap-2 text-xs text-soft">
              <input
                type="checkbox"
                checked={selected.size > 0 && selected.size === data.rows.length}
                onChange={(e) => setSelected(e.target.checked ? new Set(data.rows.map(rowKey)) : new Set())}
                className="accent-primary"
              />
              เลือกทั้งหมด ({data.rows.length})
            </label>
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => setConfirm({ kind: bulk.kind, rows: selectedRows })}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-muted"
            >
              <bulk.icon size={14} /> {bulk.label} {selected.size > 0 && `(${selected.size})`}
            </button>
          </div>
        )}

        {message && (
          <p className="border-b border-line px-4 py-2 text-xs text-confirmed-fg" role="status">
            {message}
          </p>
        )}

        {data.rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-xs text-muted">ไม่มีรายการในแท็บนี้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted">
                <tr className="border-b border-line">
                  {bulk && <th className="w-8 px-4 py-2" />}
                  <th className="px-3 py-2 font-semibold">วันที่ · เวลาในตาราง</th>
                  <th className="px-3 py-2 font-semibold">แบรนด์ · ห้อง</th>
                  <th className="px-3 py-2 font-semibold">MC</th>
                  <th className="px-3 py-2 font-semibold">เวลาจริง</th>
                  <th className="px-3 py-2 text-right font-semibold">Base</th>
                  <th className="px-3 py-2 text-right font-semibold">หัก</th>
                  <th className="px-3 py-2 text-right font-semibold">OT</th>
                  <th className="px-3 py-2 text-right font-semibold">สุทธิ</th>
                  <th className="px-3 py-2 font-semibold">สถานะ</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const p = r.payment;
                  const meta = APPROVAL_META[p ? p.approvalStatus : "toRecord"];
                  const editable = data.canRecord && (!p || p.approvalStatus === "pending");
                  return (
                    <tr key={r.slotId} className="border-b border-line/60 hover:bg-field/50">
                      {bulk && (
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(rowKey(r))}
                            onChange={() => toggle(rowKey(r))}
                            aria-label={`เลือก ${r.brandName} ${r.date}`}
                            className="accent-primary"
                          />
                        </td>
                      )}
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <p className="font-semibold">{dayLabel(r.date)}</p>
                        <p className="text-muted">{timeRange(r.startMinute, r.endMinute)}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold">
                          {r.brandName} <span className="font-normal text-muted">({r.platform})</span>
                        </p>
                        <p className="text-muted">{r.roomName}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <p className="font-semibold">{r.mc.nickname}</p>
                        <p className="text-muted">
                          {r.mc.status} · {baht(r.mc.rate)}/{r.mc.rateType === "per_slot" ? "slot" : "ชม."}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {p ? (
                          <>
                            <p>{timeRange(p.actualStart, p.actualEnd)}</p>
                            <p className={p.lateReason === "normal" ? "text-muted" : "text-waiting-fg"}>
                              {LATE_REASON_LABEL[p.lateReason]}
                              {p.note && ` · ${p.note}`}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {p ? baht(p.basePay) : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {p && p.deduction > 0 ? (
                          <span className="text-conflict-fg">-{baht(p.deduction)}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {p && p.otPay > 0 ? (
                          <span className="text-accent">+{baht(p.otPay)}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {p ? baht(p.finalPay) : <span className="font-normal text-muted">≈ {baht(onTimeEstimate(r))}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                          {meta.label}
                        </span>
                        {p?.approvedByName && <p className="mt-0.5 text-[10px] text-muted">โดย {p.approvedByName}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        {editable && (
                          <button
                            type="button"
                            onClick={() => setEditing(r)}
                            aria-label={`บันทึกเวลาจริง ${r.brandName} ${fromLiveMinutes(r.startMinute)}`}
                            className="rounded-md p-1.5 text-muted hover:bg-field hover:text-ink"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data.rows.length >= data.limit && (
          <p className="px-4 py-2 text-center text-[10px] text-muted">แสดง {data.limit} รายการแรก</p>
        )}
      </section>

      {editing && <RecordDrawer row={editing} onClose={() => setEditing(null)} />}
      {confirm && <ConfirmModal confirm={confirm} onCancel={() => setConfirm(null)} onConfirm={runConfirmed} />}
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted">{sub}</p>}
    </div>
  );
}

function ConfirmModal({
  confirm,
  onCancel,
  onConfirm,
}: {
  confirm: { kind: "onTime" | "approved" | "locked"; rows: PaymentRow[] };
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const total = confirm.rows.reduce((sum, r) => sum + (r.payment ? r.payment.finalPay : onTimeEstimate(r)), 0);
  const text = {
    onTime: {
      title: "บันทึกตรงเวลา",
      body: `บันทึก ${confirm.rows.length} สล็อตว่าไลฟ์ตรงเวลาตามตาราง (ไม่มีสาย/OT) และปิดสล็อตเป็น “เสร็จแล้ว”`,
    },
    approved: {
      title: "อนุมัติการจ่าย",
      body: `อนุมัติ ${confirm.rows.length} รายการ — หลังอนุมัติจะแก้ไขเวลาไม่ได้ และแจ้งทีม Finance ทาง Lark`,
    },
    locked: {
      title: "Lock รายการ",
      body: `Lock ${confirm.rows.length} รายการ — ใช้เมื่อส่งยอดให้ Finance เรียบร้อยแล้ว ย้อนกลับไม่ได้`,
    },
  }[confirm.kind];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl border border-line-strong bg-panel p-5">
        <h2 className="text-[15px] font-semibold">{text.title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-soft">{text.body}</p>
        <p className="mt-3 rounded-lg bg-field px-3 py-2 text-xs">
          ยอดรวม <span className="font-semibold tabular-nums">{baht(total)}</span>
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-xs text-soft hover:text-ink">
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await onConfirm();
            }}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "กำลังดำเนินการ…" : "ยืนยัน"}
          </button>
        </div>
      </div>
    </div>
  );
}
