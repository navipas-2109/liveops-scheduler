import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { StatusCounts } from "@/application/ports";
import { monthRange } from "@/application/slots/get-brand-slot-page";
import { monthLabel, shiftMonth, STATUS_META, STATUS_ORDER } from "../../format";

const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

interface Props {
  month: string;
  day: string | null;
  today: string;
  dayCounts: Record<string, StatusCounts>;
}

// Month grid: each day shows how many slots are booked, by status.
// Clicking a day opens its room-by-room availability below.
export function AvailabilityCalendar({ month, day, today, dayCounts }: Props) {
  const searchParams = useSearchParams();
  const href = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    return `?${params.toString()}`;
  };

  const { to } = monthRange(month);
  const daysInMonth = Number(to.slice(8));
  const firstWeekday = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);

  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">ปฏิทินห้องว่าง</h2>
          <p className="text-[11px] text-muted">คลิกวันเพื่อดูห้องว่างรายชั่วโมง</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={href({ month: shiftMonth(month, -1), day: null })}
            aria-label="เดือนก่อน"
            className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field"
          >
            <ChevronLeft size={14} />
          </Link>
          <span className="min-w-[120px] text-center text-xs font-semibold">{monthLabel(month)}</span>
          <Link
            href={href({ month: shiftMonth(month, 1), day: null })}
            aria-label="เดือนถัดไป"
            className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field"
          >
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const counts = dayCounts[date] ?? {};
          const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
          const selected = date === day;
          return (
            <Link
              key={date}
              href={href({ month, day: selected ? null : date })}
              scroll={false}
              className={`flex min-h-[64px] flex-col rounded-lg border p-1.5 text-left transition ${
                selected
                  ? "border-primary bg-primary/15"
                  : "border-line bg-field hover:border-line-strong"
              } ${date < today ? "opacity-60" : ""}`}
            >
              <span
                className={`text-[11px] font-semibold ${
                  date === today ? "text-accent" : "text-soft"
                }`}
              >
                {Number(date.slice(8))}
              </span>
              {total > 0 && (
                <span className="mt-auto flex flex-wrap items-center gap-1">
                  {STATUS_ORDER.filter((s) => counts[s]).map((s) => (
                    <span key={s} className="flex items-center gap-0.5 text-[9px] text-soft">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />
                      {counts[s]}
                    </span>
                  ))}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
