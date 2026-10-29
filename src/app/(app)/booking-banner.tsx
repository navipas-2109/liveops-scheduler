"use client";

import { CalendarCheck2, CalendarClock, Pencil } from "lucide-react";
import { useState } from "react";
import type { BookingWindow } from "@/domain/booking";
import { monthLabel, shiftMonth, shortDateLabel } from "../format";
import { saveBookingWindowAction } from "./booking-actions";

interface Props {
  window: BookingWindow | null;
  open: boolean;
  canEdit: boolean;
  today: string;
}

// Green when AEs can book now, amber when the window is closed.
export function BookingBanner({ window, open, canEdit, today }: Props) {
  const [editing, setEditing] = useState(false);

  const tone = open
    ? "border-confirmed-fg/25 bg-confirmed-bg text-confirmed-fg"
    : "border-waiting-fg/25 bg-waiting-bg text-waiting-fg";
  const Icon = open ? CalendarCheck2 : CalendarClock;

  let text: string;
  if (!window) text = "ยังไม่มี Booking Window — AE ยังลงสล็อตไม่ได้";
  else if (open)
    text = `Booking Window เปิดอยู่ · ลงสล็อตเดือน ${monthLabel(window.targetMonth)} ได้ถึง ${shortDateLabel(window.openTo)}`;
  else
    text = `Booking Window ปิดอยู่ · รอบถัดไป: เดือน ${monthLabel(window.targetMonth)} เปิด ${shortDateLabel(window.openFrom)} – ${shortDateLabel(window.openTo)}`;

  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Icon size={18} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">{text}</p>
          {window?.note && <p className="mt-0.5 text-[11px] opacity-80">{window.note}</p>}
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-md border border-current/30 px-2.5 py-1 text-[11px] font-semibold hover:bg-black/10"
          >
            <Pencil size={12} /> ตั้งค่า Booking Window
          </button>
        )}
      </div>
      {editing && (
        <WindowForm
          initial={
            window ?? {
              targetMonth: shiftMonth(today.slice(0, 7), 1),
              openFrom: today,
              openTo: today,
              note: "",
            }
          }
          onDone={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function WindowForm({ initial, onDone }: { initial: BookingWindow; onDone: () => void }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const field =
    "rounded-md border border-line-strong bg-field px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary";

  async function save() {
    setPending(true);
    const result = await saveBookingWindowAction(values);
    setPending(false);
    if (result.ok) onDone();
    else setError(result.error);
  }

  return (
    <div className="mt-3 grid gap-3 border-t border-current/20 pt-3 text-ink sm:grid-cols-4">
      <label className="grid gap-1 text-[11px] text-soft">
        เดือนที่ให้ลงสล็อต
        <input
          type="month"
          value={values.targetMonth}
          onChange={(e) => setValues({ ...values, targetMonth: e.target.value })}
          className={field}
        />
      </label>
      <label className="grid gap-1 text-[11px] text-soft">
        เปิดรับตั้งแต่
        <input
          type="date"
          value={values.openFrom}
          onChange={(e) => setValues({ ...values, openFrom: e.target.value })}
          className={field}
        />
      </label>
      <label className="grid gap-1 text-[11px] text-soft">
        ถึงวันที่
        <input
          type="date"
          value={values.openTo}
          onChange={(e) => setValues({ ...values, openTo: e.target.value })}
          className={field}
        />
      </label>
      <label className="grid gap-1 text-[11px] text-soft">
        หมายเหตุ
        <input
          value={values.note}
          onChange={(e) => setValues({ ...values, note: e.target.value })}
          className={field}
        />
      </label>
      <div className="flex items-center gap-2 sm:col-span-4">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          บันทึก
        </button>
        <button type="button" onClick={onDone} className="px-2 py-1.5 text-xs text-soft hover:text-ink">
          ยกเลิก
        </button>
        {error && <span className="text-xs text-conflict-fg">{error}</span>}
      </div>
    </div>
  );
}
