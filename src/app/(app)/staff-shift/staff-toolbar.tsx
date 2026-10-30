"use client";

import { ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { ImportDrawer } from "./import-drawer";

export type StaffView = "month" | "week" | "day";

const VIEW_LABEL: Record<StaffView, string> = { month: "เดือน", week: "สัปดาห์", day: "วัน" };

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
}: {
  view: StaffView;
  date: string;
  title: string;
  canEdit: boolean;
}) {
  const pathname = usePathname();
  const [importing, setImporting] = useState(false);
  const href = (v: StaffView, d: string | null) => `${pathname}?view=${v}${d ? `&date=${d}` : ""}`;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-line-strong">
          {(["month", "week", "day"] as const).map((v) => (
            <Link
              key={v}
              href={href(v, date)}
              className={`px-3 py-1.5 text-xs font-medium ${
                view === v ? "bg-primary text-white" : "bg-field text-muted hover:text-soft"
              }`}
            >
              {VIEW_LABEL[v]}
            </Link>
          ))}
        </div>
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
      {canEdit && (
        <button
          type="button"
          onClick={() => setImporting(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
        >
          <FileSpreadsheet size={14} /> นำเข้ากะจาก Google Sheet
        </button>
      )}
      {importing && <ImportDrawer defaultMonth={date.slice(0, 7)} onClose={() => setImporting(false)} />}
    </section>
  );
}
