"use client";

import { ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ShiftItem, SlotListItem } from "@/application/ports";
import type { StaffShiftPageData } from "@/application/shifts/staff-shift";
import { SHIFT_CODES } from "@/domain/shift-sheet";
import { isStaffReady } from "@/domain/slot-rules";
import { fromIsoDate, fromLiveMinutes, toIsoDate } from "@/domain/time";
import { dayLabel, timeRange } from "../../format";
import { ImportDrawer } from "./import-drawer";
import { StaffRow } from "./staff-row";

// Order the shift groups appear in, morning to evening, office last.
const GROUP_ORDER = ["2", "4", "3", "OF"];

function shiftDay(date: string, n: number) {
  const d = fromIsoDate(date);
  d.setUTCDate(d.getUTCDate() + n);
  return toIsoDate(d);
}

export function StaffShiftView({ data }: { data: StaffShiftPageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [importing, setImporting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const s = data.summary;
  const notReady = data.slots.filter((x) => !isStaffReady(x) && x.status !== "completed");
  const listed = showAll ? data.slots : notReady;
  const working = data.shifts.filter((x) => x.kind === "live" || x.kind === "office");
  const away = data.shifts.filter((x) => x.kind === "off" || x.kind === "leave");
  const groups = GROUP_ORDER.map((code) => ({ code, people: working.filter((x) => x.code === code) })).filter(
    (g) => g.people.length > 0,
  );
  // Shifts that came from somewhere other than the sheet codes (e.g. demo data).
  const other = working.filter((x) => !GROUP_ORDER.includes(x.code));
  if (other.length) groups.push({ code: "", people: other });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${pathname}?date=${shiftDay(data.date, -1)}`} aria-label="วันก่อน" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
            <ChevronLeft size={14} />
          </Link>
          <Link href={`${pathname}?date=${shiftDay(data.date, 1)}`} aria-label="วันถัดไป" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
            <ChevronRight size={14} />
          </Link>
          <Link href={pathname} className="rounded-md border border-line-strong px-2.5 py-1 text-xs text-soft hover:bg-field">
            วันนี้
          </Link>
          <input
            type="date"
            value={data.date}
            onChange={(e) => e.target.value && router.replace(`${pathname}?date=${e.target.value}`)}
            aria-label="เลือกวัน"
            className="rounded-md border border-line-strong bg-field px-2 py-1 text-xs text-ink outline-none"
          />
          <span className="text-sm font-semibold">{dayLabel(data.date)}</span>
        </div>
        {data.canEdit && (
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
          >
            <FileSpreadsheet size={14} /> นำเข้ากะจาก Google Sheet
          </button>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card label="PD เข้ากะไลฟ์" value={s.onShift} />
        <Card label="เวลาออฟฟิศ (OF)" value={s.office} />
        <Card label="หยุด / ลา" value={s.away} />
        <Card label="ไลฟ์วันนี้" value={s.lives} />
        <Card
          label="ทีมงานพร้อม"
          value={`${s.ready}/${s.lives}`}
          tone={s.ready === s.lives ? "text-confirmed-fg" : "text-waiting-fg"}
        />
      </div>

      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">ลงทีมงานไลฟ์</h2>
            <p className="text-[11px] text-muted">
              ไลฟ์จะ “พร้อม” เมื่อมี Producer และ Admin 1 — รายชื่อเรียง PD ที่เข้ากะครอบเวลาไลฟ์ไว้ก่อน
            </p>
          </div>
          <div className="flex gap-1">
            {[
              [false, `ยังไม่พร้อม (${notReady.length})`],
              [true, `ทั้งหมด (${data.slots.length})`],
            ].map(([all, label]) => (
              <button
                key={String(all)}
                type="button"
                onClick={() => setShowAll(all as boolean)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  showAll === all ? "bg-primary/15 text-accent" : "text-muted hover:bg-field hover:text-soft"
                }`}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>
        {listed.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted">
            {data.slots.length === 0 ? "วันนี้ไม่มีไลฟ์" : "ทุกไลฟ์มีทีมงานครบแล้ว 🎉"}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {listed.map((slot) => (
              <StaffRow
                key={`${slot.id}-${slot.producerId}-${slot.admin1Id}-${slot.admin2Id}`}
                slot={slot}
                shifts={data.shifts}
                producers={data.producers}
                canEdit={data.canEdit && slot.status !== "completed"}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">PD ที่เข้างานวันนี้</h2>
        {working.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-muted">
            ยังไม่มีกะของวันนี้{data.canEdit && " — กด “นำเข้ากะจาก Google Sheet” ด้านบน"}
          </p>
        ) : (
          <div className="grid gap-4">
            {groups.map((g) => (
              <ShiftGroup key={g.code || "other"} code={g.code} people={g.people} slots={data.slots} />
            ))}
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

      {importing && <ImportDrawer defaultMonth={data.date.slice(0, 7)} onClose={() => setImporting(false)} />}
    </div>
  );
}

function Card({ label, value, tone = "text-ink" }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function ShiftGroup({ code, people, slots }: { code: string; people: ShiftItem[]; slots: SlotListItem[] }) {
  const def = SHIFT_CODES[code];
  const first = people[0];
  const hours =
    first.shiftStart !== null && first.shiftEnd !== null
      ? `${fromLiveMinutes(first.shiftStart)}–${fromLiveMinutes(first.shiftEnd)}`
      : "";
  return (
    <div>
      <p className="mb-2 text-xs font-semibold">
        {def ? `${code} · ${def.label}` : "กะอื่น ๆ"} <span className="font-normal text-muted">{def && hours} · {people.length} คน</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {people.map((p) => {
          const mine = slots.filter((x) => [x.producerId, x.admin1Id, x.admin2Id].includes(p.producerId));
          return (
            <div key={p.producerId} className="rounded-lg border border-line bg-field px-3 py-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.producerName}</p>
                  <p className="truncate text-[11px] text-muted">
                    {p.position}
                    {p.squad && ` · ${p.squad}`}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted">
                  {!def && p.shiftStart !== null && p.shiftEnd !== null
                    ? `${fromLiveMinutes(p.shiftStart)}–${fromLiveMinutes(p.shiftEnd)} · `
                    : ""}
                  {mine.length} ไลฟ์
                </span>
              </div>
              {mine.length > 0 && (
                <ul className="mt-2 grid gap-1">
                  {mine.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px]">
                        {timeRange(x.startMinute, x.endMinute)} · {x.brandName}{" "}
                        <span className="text-muted">
                          ({x.producerId === p.producerId ? "Producer" : "Admin"})
                        </span>
                      </span>
                      {isStaffReady(x) ? (
                        <span className="shrink-0 rounded bg-confirmed-bg px-1.5 text-[10px] text-confirmed-fg">พร้อม</span>
                      ) : (
                        <span className="shrink-0 rounded bg-waiting-bg px-1.5 text-[10px] text-waiting-fg">ไม่พร้อม</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

