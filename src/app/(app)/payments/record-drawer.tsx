"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PaymentRow } from "@/application/ports";
import { calculatePayment, type LateReason } from "@/domain/payment";
import { fromLiveMinutes, toLiveMinutes } from "@/domain/time";
import { baht, dayLabel, LATE_REASON_LABEL, timeRange } from "../../format";
import { recordPaymentAction } from "./actions";

const field =
  "w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-[13px] text-ink outline-none " +
  "focus:border-primary focus:ring-2 focus:ring-primary/25";

function parseTime(value: string): number | null {
  try {
    return toLiveMinutes(value);
  } catch {
    return null;
  }
}

// Operation enters what actually happened; the pay preview updates as they type.
// The server recalculates on save, so the preview is only for checking.
export function RecordDrawer({ row, onClose }: { row: PaymentRow; onClose: () => void }) {
  const p = row.payment;
  const [start, setStart] = useState(fromLiveMinutes(p?.actualStart ?? row.startMinute));
  const [end, setEnd] = useState(fromLiveMinutes(p?.actualEnd ?? row.endMinute));
  const [lateReason, setLateReason] = useState<LateReason>(p?.lateReason ?? "normal");
  const [note, setNote] = useState(p?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const actualStart = parseTime(start);
  const actualEnd = parseTime(end);
  let preview: ReturnType<typeof calculatePayment> | null = null;
  let previewError: string | null = null;
  if (actualStart === null || actualEnd === null) previewError = "กรอกเวลาให้ครบ";
  else if (actualEnd <= actualStart) previewError = "เวลาจบจริงต้องหลังเวลาเริ่มจริง";
  else
    preview = calculatePayment({
      plannedStart: row.startMinute,
      plannedEnd: row.endMinute,
      actualStart,
      actualEnd,
      lateReason,
      rateType: row.mc.rateType,
      rate: row.mc.rate,
    });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!preview || actualStart === null || actualEnd === null) return;
    setPending(true);
    setError(null);
    const result = await recordPaymentAction({ slotId: row.slotId, actualStart, actualEnd, lateReason, note });
    setPending(false);
    if (result.ok) onClose();
    else setError(result.error);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <form onSubmit={save} className="relative flex h-full w-full max-w-[420px] flex-col border-l border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">บันทึกเวลาไลฟ์จริง</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
          <div className="rounded-lg bg-field px-3 py-2.5 text-xs">
            <p className="font-semibold">
              {row.brandName} <span className="font-normal text-muted">({row.platform})</span>
            </p>
            <p className="mt-0.5 text-soft">
              {dayLabel(row.date)} · ในตาราง {timeRange(row.startMinute, row.endMinute)} · {row.roomName}
            </p>
            <p className="mt-0.5 text-soft">
              MC {row.mc.nickname} · {row.mc.status} · {baht(row.mc.rate)}/{row.mc.rateType === "per_slot" ? "slot" : "ชม."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">เริ่มจริง</span>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={field} required />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">จบจริง</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={field} required />
            </label>
          </div>

          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-[11px] text-soft">ถ้าเริ่มช้า เป็นเพราะ</legend>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-field p-1">
              {(Object.keys(LATE_REASON_LABEL) as LateReason[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setLateReason(r)}
                  aria-pressed={lateReason === r}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-medium ${
                    lateReason === r ? "bg-card text-ink shadow" : "text-muted hover:text-soft"
                  }`}
                >
                  {LATE_REASON_LABEL[r]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted">หักเงินเฉพาะ “MC มาสาย” — ปัญหาเทคนิคจ่ายเต็ม · OT จ่ายเสมอ (×1.5)</p>
          </fieldset>

          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">หมายเหตุ</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="เช่น Stream หลุด 15 นาที" className={`${field} placeholder:text-muted`} />
          </label>

          <div className="rounded-lg border border-line p-3 text-xs">
            {preview ? (
              <dl className="grid grid-cols-2 gap-y-1.5">
                <dt className="text-muted">Base</dt>
                <dd className="text-right tabular-nums">{baht(preview.basePay)}</dd>
                <dt className="text-muted">หักมาสาย ({preview.lateMin} นาที)</dt>
                <dd className="text-right tabular-nums text-conflict-fg">-{baht(preview.deduction)}</dd>
                <dt className="text-muted">OT ({preview.otMin} นาที × 1.5)</dt>
                <dd className="text-right tabular-nums text-accent">+{baht(preview.otPay)}</dd>
                <dt className="border-t border-line pt-1.5 font-semibold">ยอดจ่ายสุทธิ</dt>
                <dd className="border-t border-line pt-1.5 text-right text-sm font-semibold tabular-nums">{baht(preview.finalPay)}</dd>
              </dl>
            ) : (
              <p className="text-conflict-fg">{previewError}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-conflict-fg/30 bg-conflict-bg px-3 py-2 text-xs text-conflict-fg">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-soft hover:text-ink">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={pending || !preview}
            className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}
