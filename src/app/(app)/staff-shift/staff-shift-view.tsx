"use client";

import { useState } from "react";
import type { ShiftItem } from "@/application/ports";
import type { StaffShiftPageData } from "@/application/shifts/staff-shift";
import { SHIFT_CODES } from "@/domain/shift-sheet";
import { fromLiveMinutes } from "@/domain/time";
import { dayLabel } from "../../format";
import { SquadSelect } from "./squad-select";
import { StaffToolbar } from "./staff-toolbar";

// Order the shift groups appear in, morning to evening, office last.
const GROUP_ORDER = ["2", "4", "3", "OF"];

// One day: who is on which shift and how many lives each person has.
// Staffing lives happens on Input Live Slot.
export function StaffShiftView({ data }: { data: StaffShiftPageData }) {
  const [squad, setSquad] = useState("");
  const inSquad = (x: ShiftItem) => !squad || x.squad === squad;

  const slotCount = (producerId: string) =>
    data.slots.filter((x) => [x.producerId, x.admin1Id, x.admin2Id].includes(producerId)).length;
  const working = data.shifts.filter((x) => (x.kind === "live" || x.kind === "office") && inSquad(x));
  const away = data.shifts.filter((x) => (x.kind === "off" || x.kind === "leave") && inSquad(x));
  const groups = GROUP_ORDER.map((code) => ({ code, people: working.filter((x) => x.code === code) })).filter(
    (g) => g.people.length > 0,
  );
  const other = working.filter((x) => !GROUP_ORDER.includes(x.code));
  if (other.length) groups.push({ code: "", people: other });
  const squads = [...new Set(data.shifts.map((x) => x.squad).filter(Boolean))].sort();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <StaffToolbar view="day" date={data.date} title={dayLabel(data.date)} canEdit={data.canEdit} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="PD เข้ากะไลฟ์" value={working.filter((x) => x.kind === "live").length} />
        <Card label="เวลาออฟฟิศ (OF)" value={working.filter((x) => x.kind === "office").length} />
        <Card label="หยุด / ลา" value={away.length} />
        <Card label="สล็อตวันนี้ (ทั้งหมด)" value={data.slots.length} />
      </div>

      <section className="rounded-xl border border-line bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">กะของ Producer</h2>
          <SquadSelect squads={squads} value={squad} onChange={setSquad} />
        </div>
        {working.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-muted">
            {data.shifts.length === 0 ? "ยังไม่มีกะของวันนี้ — กด “นำเข้ากะจาก Google Sheet” ด้านบน" : "ไม่มี PD ใน Squad นี้"}
          </p>
        ) : (
          <div className="grid gap-4">
            {groups.map((g) => {
              const def = SHIFT_CODES[g.code];
              return (
                <div key={g.code || "other"}>
                  <p className="mb-2 text-xs font-semibold">
                    {def ? `${g.code} · ${def.label}` : "กะอื่น ๆ"}{" "}
                    <span className="font-normal text-muted">
                      {def?.start && `${def.start}–${def.end} · `}
                      {g.people.length} คน
                    </span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {g.people.map((p) => {
                      const n = slotCount(p.producerId);
                      return (
                        <div key={p.producerId} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-field px-3 py-2 text-xs">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{p.producerName}</span>
                            <span className="block truncate text-[10px] text-muted">
                              {p.position}
                              {p.squad && ` · ${p.squad}`}
                              {!def && p.shiftStart !== null && p.shiftEnd !== null && ` · ${fromLiveMinutes(p.shiftStart)}–${fromLiveMinutes(p.shiftEnd)}`}
                            </span>
                          </span>
                          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${n ? "bg-primary/15 text-accent" : "bg-card text-muted"}`}>
                            {n} สล็อต
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {away.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-[11px] font-semibold text-muted">หยุด / ลา</p>
            <div className="flex flex-wrap gap-1.5">
              {away.map((a) => (
                <span key={a.producerId} className="rounded-md bg-field px-2 py-1 text-[11px] text-soft">
                  {a.producerName} · <span className="text-muted">{SHIFT_CODES[a.code]?.label ?? a.code}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
