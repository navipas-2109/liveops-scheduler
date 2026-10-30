"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { StaffGridData } from "@/application/shifts/staff-shift";
import { SHIFT_CODES } from "@/domain/shift-sheet";
import { dayLabel, monthLabel, shortDateLabel } from "../../format";
import { StaffToolbar } from "./staff-toolbar";

// Same colour families as the .xlsx template, dark-theme versions.
export const CODE_STYLE: Record<string, string> = {
  "1": "bg-line/70 text-muted",
  "2": "bg-[#16304f] text-[#8cc0f5]",
  "4": "bg-confirmed-bg text-confirmed-fg",
  "3": "bg-[#2e2550] text-[#c4b5fd]",
  OF: "bg-waiting-bg text-waiting-fg",
  VL: "bg-conflict-bg text-conflict-fg",
};

const WEEKDAY = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const POSITIONS = ["Producer Team Lead", "Senior Producer", "Producer", "Jr. Producer"];

// Week and month: one row per person, one column per day — like the team's
// Shift Planning sheet, with how many lives each person staffs that day.
export function StaffGridView({ data }: { data: StaffGridData }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string | null>(null);
  const week = data.view === "week";

  const q = query.trim().toLowerCase();
  const people = data.people.filter(
    (p) =>
      (!position || p.position === position) &&
      (!q || p.name.toLowerCase().includes(q) || p.squad.toLowerCase().includes(q)),
  );
  const title = week ? `${shortDateLabel(data.from)} – ${shortDateLabel(data.to)}` : monthLabel(data.from.slice(0, 7));
  const dayHref = (d: string) => `?view=day&date=${d}`;
  const weekday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();
  const cellW = week ? "min-w-[96px]" : "min-w-[38px]";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <StaffToolbar view={data.view} date={data.date} title={title} canEdit={data.canEdit} />

      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-line-strong bg-field px-2.5 py-1.5 text-muted">
              <Search size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อหรือ Squad"
                className="w-40 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {[null, ...POSITIONS].map((p) => (
                <button
                  key={p ?? "all"}
                  type="button"
                  onClick={() => setPosition(p)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                    position === p ? "bg-primary/15 text-accent" : "text-muted hover:bg-field hover:text-soft"
                  }`}
                >
                  {p ?? `ทั้งหมด (${data.people.length})`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SHIFT_CODES).map(([code, c]) => (
              <span key={code} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${CODE_STYLE[code]}`}>
                {code} {c.label}
              </span>
            ))}
            <span className="rounded px-1.5 py-0.5 text-[10px] text-soft ring-1 ring-inset ring-conflict-fg">มีไลฟ์ในวันหยุด/ลา</span>
            <span className="rounded px-1.5 py-0.5 text-[10px] text-waiting-fg">– มีไลฟ์แต่ยังไม่ลงกะ</span>
          </div>
        </div>

        {data.people.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted">
            ยังไม่มีกะในช่วงนี้{data.canEdit && " — กด “นำเข้ากะจาก Google Sheet” ด้านบน"}
          </p>
        ) : (
          <div className="max-h-[calc(100vh-260px)] overflow-auto">
            <table className="border-separate border-spacing-0 text-[11px]">
              <thead className="sticky top-0 z-20 bg-card">
                <tr>
                  <th className="sticky left-0 z-30 min-w-[180px] border-b border-line bg-card px-3 py-2 text-left font-semibold text-muted">
                    PD ({people.length})
                  </th>
                  {data.days.map((d) => {
                    const t = data.totals[d];
                    const weekend = weekday(d) === 0 || weekday(d) === 6;
                    return (
                      <th key={d} className={`${cellW} border-b border-l border-line/60 px-1 py-1.5 font-medium`}>
                        <Link
                          href={dayHref(d)}
                          title="เปิดมุมมองวัน"
                          className={`block rounded px-1 hover:bg-field ${
                            d === data.today ? "text-accent" : weekend ? "text-conflict-fg" : "text-soft"
                          }`}
                        >
                          {week ? dayLabel(d) : (
                            <>
                              <span className="block text-[9px] text-muted">{WEEKDAY[weekday(d)]}</span>
                              {Number(d.slice(8))}
                            </>
                          )}
                        </Link>
                        {week && (
                          <span className="mt-0.5 block text-[10px] font-normal text-muted">
                            {t.live} คน · {t.lives} ไลฟ์
                            {t.notReady > 0 && <span className="text-waiting-fg"> · ไม่พร้อม {t.notReady}</span>}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.producerId} className="hover:bg-field/40">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 max-w-[220px] border-b border-line/60 bg-card px-3 py-1.5 text-left font-normal"
                    >
                      <span className="block truncate font-semibold text-ink">{p.name}</span>
                      <span className="block truncate text-[10px] text-muted">
                        {p.position}
                        {p.squad && ` · ${p.squad}`}
                      </span>
                    </th>
                    {data.days.map((d) => {
                      const code = data.codes[p.producerId]?.[d];
                      const lives = data.assigned[p.producerId]?.[d] ?? 0;
                      const def = code ? SHIFT_CODES[code] : undefined;
                      // Staffing a live on a day off / leave, or with no shift entered.
                      const awayButBooked = lives > 0 && (def?.kind === "off" || def?.kind === "leave");
                      const noShift = lives > 0 && !code;
                      return (
                        <td key={d} className="border-b border-l border-line/60 p-0.5 text-center">
                          {code || lives ? (
                            <Link
                              href={dayHref(d)}
                              title={`${p.name} · ${dayLabel(d)}${def ? ` · ${def.label}${def.start ? ` ${def.start}–${def.end}` : ""}` : ""}${lives ? ` · ${lives} ไลฟ์` : ""}${
                                awayButBooked ? " · ⚠ มีไลฟ์ในวันหยุด/ลา" : noShift ? " · ⚠ มีไลฟ์แต่ยังไม่ลงกะ" : ""
                              }`}
                              className={`flex items-center justify-center gap-1 rounded px-1 py-1 font-semibold ${
                                code ? (CODE_STYLE[code] ?? "bg-field text-soft") : "text-muted"
                              } ${awayButBooked ? "ring-2 ring-inset ring-conflict-fg" : ""} ${noShift ? "text-waiting-fg" : ""}`}
                            >
                              {code ?? "–"}
                              {lives > 0 && (
                                <span className={`text-[9px] font-normal ${week ? "" : "hidden xl:inline"}`}>
                                  {week ? `· ${lives} ไลฟ์` : lives}
                                </span>
                              )}
                            </Link>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 bg-card text-[10px]">
                {(
                  [
                    ["เข้ากะไลฟ์ (คน)", (d: string) => data.totals[d].live, ""],
                    ["ไลฟ์", (d: string) => data.totals[d].lives, ""],
                    ["ทีมงานไม่พร้อม", (d: string) => data.totals[d].notReady, "text-waiting-fg"],
                  ] as const
                ).map(([label, value, tone]) => (
                  <tr key={label}>
                    <th className="sticky left-0 z-30 border-t border-line bg-card px-3 py-1 text-left font-semibold text-muted">
                      {label}
                    </th>
                    {data.days.map((d) => {
                      const v = value(d);
                      return (
                        <td key={d} className={`border-l border-t border-line/60 px-1 py-1 text-center tabular-nums ${v ? tone || "text-soft" : "text-muted/50"}`}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
