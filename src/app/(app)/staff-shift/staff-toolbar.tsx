"use client";

import { CircleCheck, ChevronLeft, ChevronRight, FileSpreadsheet, PencilLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ShiftMonthInfo } from "@/application/ports";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { monthLabel } from "../../format";
import { setShiftMonthAction } from "./actions";
import { ImportDrawer } from "./import-drawer";

export type StaffView = "month" | "week" | "day";

const VIEW_LABEL: Record<StaffView, string> = { month: "เดือน", week: "สัปดาห์", day: "วัน" };

// Shift views and the Producer list share one page.
export function StaffTabs({ view, date }: { view: StaffView | "people"; date: string | null }) {
  const pathname = usePathname();
  const tab = (v: StaffView | "people", label: string) => (
    <Link
      key={v}
      href={`${pathname}?view=${v}${date && v !== "people" ? `&date=${date}` : ""}`}
      className={`px-3 py-1.5 text-xs font-medium ${view === v ? "bg-primary text-white" : "bg-field text-muted hover:text-soft"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex overflow-hidden rounded-lg border border-line-strong">
      {(["month", "week", "day"] as const).map((v) => tab(v, `กะ · ${VIEW_LABEL[v]}`))}
      {tab("people", "รายชื่อ Producer")}
    </div>
  );
}

function shift(view: StaffView, date: string, dir: number): string {
  const d = fromIsoDate(date);
  if (view === "day") d.setUTCDate(d.getUTCDate() + dir);
  else if (view === "week") d.setUTCDate(d.getUTCDate() + 7 * dir);
  else d.setUTCMonth(d.getUTCMonth() + dir, 1);
  return toIsoDate(d);
}

// View switch, previous/next/today and the import button, shared by the
// day, week and month views of Staff Shift.
export function StaffToolbar({
  view,
  date,
  title,
  canEdit,
  shiftMonth,
}: {
  view: StaffView;
  date: string;
  title: string;
  canEdit: boolean;
  shiftMonth: ShiftMonthInfo | null;
}) {
  const pathname = usePathname();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const month = date.slice(0, 7);
  async function setConfirmed(confirmed: boolean) {
    const question = confirmed
      ? `ยืนยันกะของ Producer เดือน ${monthLabel(month)}?\nหลังยืนยันจะนำเข้ากะทับไม่ได้ จนกว่าจะกด “แก้ไขกะ”`
      : `เปิดแก้ไขกะเดือน ${monthLabel(month)}?`;
    if (!window.confirm(question)) return;
    const r = await setShiftMonthAction(month, confirmed);
    setError(r.ok ? null : r.error);
  }
  const href = (v: StaffView, d: string | null) => `${pathname}?view=${v}${d ? `&date=${d}` : ""}`;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <StaffTabs view={view} date={date} />
        <Link href={href(view, shift(view, date, -1))} aria-label="ก่อนหน้า" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
          <ChevronLeft size={14} />
        </Link>
        <Link href={href(view, shift(view, date, 1))} aria-label="ถัดไป" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
          <ChevronRight size={14} />
        </Link>
        <Link href={href(view, null)} className="rounded-md border border-line-strong px-2.5 py-1 text-xs text-soft hover:bg-field">
          วันนี้
        </Link>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {shiftMonth ? (
          <span className="flex items-center gap-1.5 rounded-md bg-confirmed-bg px-2.5 py-1.5 text-[11px] font-semibold text-confirmed-fg">
            <CircleCheck size={13} /> กะเดือน {monthLabel(month)} ยืนยันแล้ว · {shiftMonth.confirmedByName}
          </span>
        ) : (
          <span className="rounded-md bg-waiting-bg px-2.5 py-1.5 text-[11px] font-semibold text-waiting-fg">
            กะเดือน {monthLabel(month)} ยังไม่ยืนยัน
          </span>
        )}
        {canEdit &&
          (shiftMonth ? (
            <button
              type="button"
              onClick={() => setConfirmed(false)}
              className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs font-medium text-soft hover:bg-field"
            >
              <PencilLine size={14} /> แก้ไขกะ
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setImporting(true)}
                className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs font-medium text-soft hover:bg-field"
              >
                <FileSpreadsheet size={14} /> นำเข้ากะจาก Google Sheet
              </button>
              <button
                type="button"
                onClick={() => setConfirmed(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
              >
                <CircleCheck size={14} /> ยืนยันกะเดือนนี้
              </button>
            </>
          ))}
      </div>
      {error && <p role="alert" className="w-full text-xs text-conflict-fg">{error}</p>}
      {importing && <ImportDrawer defaultMonth={date.slice(0, 7)} onClose={() => setImporting(false)} />}
    </section>
  );
}
