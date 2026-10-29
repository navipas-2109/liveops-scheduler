import Link from "next/link";
import type { DaySummary } from "@/application/slots/get-schedule-page";
import { monthRange } from "@/application/slots/get-brand-slot-page";
import { STATUS_META, STATUS_ORDER } from "../../format";

const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

interface Props {
  month: string;
  today: string;
  summaries: Record<string, DaySummary>;
  dayHref: (date: string) => string;
}

// Calendar grid: status counts and the first few brands each day.
export function MonthGrid({ month, today, summaries, dayHref }: Props) {
  const days = Number(monthRange(month).to.slice(8));
  const offset = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);

  return (
    <section className="rounded-xl border border-line bg-card p-3">
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
          const s = summaries[date];
          return (
            <Link
              key={date}
              href={dayHref(date)}
              className={`flex min-h-[104px] min-w-0 flex-col gap-1 rounded-lg border border-line bg-field p-1.5 hover:border-line-strong ${
                date < today ? "opacity-70" : ""
              }`}
            >
              <span className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${date === today ? "text-accent" : "text-soft"}`}>
                  {Number(date.slice(8))}
                </span>
                {s && <span className="text-[9px] text-muted">{s.total}</span>}
              </span>
              {s && (
                <>
                  <span className="flex flex-wrap gap-1">
                    {STATUS_ORDER.filter((st) => s.counts[st]).map((st) => (
                      <span key={st} className="flex items-center gap-0.5 text-[9px] text-soft">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[st].dot}`} />
                        {s.counts[st]}
                      </span>
                    ))}
                  </span>
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {s.brands.map((b, j) => (
                      <span
                        key={j}
                        className={`truncate rounded px-1 text-[9px] font-medium ${STATUS_META[b.status].className}`}
                      >
                        {b.name}
                      </span>
                    ))}
                    {s.total > s.brands.length && (
                      <span className="text-[9px] text-muted">+{s.total - s.brands.length} อื่น ๆ</span>
                    )}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
