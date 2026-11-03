"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { SlotListItem } from "@/application/ports";
import type { SchedulePageData, ScheduleView } from "@/application/slots/get-schedule-page";
import type { Role } from "@/domain/roles";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { dayLabel, monthLabel, shortDateLabel, STATUS_META, STATUS_ORDER } from "../../format";
import { SearchSelect } from "../search-select";
import { DayTimeline } from "./day-timeline";
import { MonthGrid } from "./month-grid";
import { pdRows, roomColors, type TimelineRow } from "./schedule-shared";
import { SlotDetail } from "./slot-detail";
import { WeekTimeline } from "./week-timeline";

const VIEW_LABEL: Record<ScheduleView, string> = { month: "เดือน", week: "สัปดาห์", day: "วัน" };

function shift(view: ScheduleView, date: string, dir: number): string {
  const d = fromIsoDate(date);
  if (view === "day") d.setUTCDate(d.getUTCDate() + dir);
  else if (view === "week") d.setUTCDate(d.getUTCDate() + 7 * dir);
  else d.setUTCMonth(d.getUTCMonth() + dir, 1);
  return toIsoDate(d);
}

// Read-only schedule by room (all rooms of the Room Database) or, for a day,
// by Producer; filterable by room, brand, channel and the PD's team / squad.
// Slots are entered on Input Live Slot.
export function ScheduleScreen({ data, role }: { data: SchedulePageData; role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<SlotListItem | null>(null);

  const href = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    return `${pathname}?${params.toString()}`;
  };
  const go = (changes: Record<string, string | null>) => router.replace(href(changes), { scroll: false });
  const colors = roomColors(data.rooms);

  const brandNames = [...new Set(data.brands.map((b) => b.brandName))].sort();
  const channels = [
    ...new Set(data.brands.filter((b) => !data.brandName || b.brandName === data.brandName).map((b) => b.platform)),
  ].sort();

  const byPd = data.grouping === "pd";
  const roomRows: TimelineRow[] = (data.roomId ? data.rooms.filter((r) => r.id === data.roomId) : data.rooms).map(
    (room) => ({
      id: room.id,
      title: room.shortName,
      subtitle: `${room.building} F${room.floor} · ${room.size}`,
      accent: colors[room.id],
      shift: null,
      slots: data.slots.filter((s) => s.roomId === room.id),
      roomId: room.id,
    }),
  );
  const visibleRows = byPd ? pdRows(data.slots, data.shifts) : roomRows;
  const filtering = !!(data.brandName || data.platform || data.team || data.squad || data.producerId);
  const isPd = !!data.ownProducerId;
  const pdName = data.producers.find((p) => p.id === data.producerId)?.name;
  // A PD login starts on their own lives; "all" shows everyone.
  const pickPd = (id: string) => go({ pd: id || (isPd ? "all" : null) });

  const title =
    data.view === "day"
      ? dayLabel(data.date)
      : data.view === "week"
        ? `${shortDateLabel(data.from)} – ${shortDateLabel(data.to)}`
        : monthLabel(data.date.slice(0, 7));
  const select =
    "max-w-[200px] rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink outline-none";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="grid gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-line-strong">
              {(["month", "week", "day"] as const).map((v) => (
                <Link
                  key={v}
                  href={href({ view: v })}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    data.view === v ? "bg-primary text-white" : "bg-field text-muted hover:text-soft"
                  }`}
                >
                  {VIEW_LABEL[v]}
                </Link>
              ))}
            </div>
            <Link href={href({ date: shift(data.view, data.date, -1) })} aria-label="ก่อนหน้า" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
              <ChevronLeft size={14} />
            </Link>
            <Link href={href({ date: shift(data.view, data.date, 1) })} aria-label="ถัดไป" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
              <ChevronRight size={14} />
            </Link>
            <Link href={href({ date: null })} className="rounded-md border border-line-strong px-2.5 py-1 text-xs text-soft hover:bg-field">
              วันนี้
            </Link>
            <span className="text-sm font-semibold">{title}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {STATUS_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-1 text-[10px] text-soft">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {data.view === "day" && (
            <div className="mr-2 flex overflow-hidden rounded-lg border border-line-strong">
              {([["room", "ตามห้อง"], ["pd", "ตาม Producer"]] as const).map(([by, label]) => (
                <Link
                  key={by}
                  href={href({ by: by === "pd" ? "pd" : null })}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    (by === "pd") === byPd ? "bg-primary text-white" : "bg-field text-muted hover:text-soft"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
          <span className="text-[11px] text-muted">กรอง</span>
          <select value={data.brandName ?? ""} onChange={(e) => go({ brand: e.target.value || null, channel: null })} aria-label="กรองตามแบรนด์" className={select}>
            <option value="">ทุกแบรนด์</option>
            {brandNames.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select value={data.platform ?? ""} onChange={(e) => go({ channel: e.target.value || null })} aria-label="กรองตาม Channel" className={select}>
            <option value="">ทุก Channel</option>
            {channels.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={data.roomId ?? ""} onChange={(e) => go({ room: e.target.value || null })} aria-label="กรองตามห้อง" className={select}>
            <option value="">ทุกห้อง ({data.rooms.length})</option>
            {data.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.buildingCode} F{r.floor} · {r.shortName}
              </option>
            ))}
          </select>
          <div className="w-52">
            <SearchSelect
              value={data.producerId ?? ""}
              options={data.producers.map((p) => ({
                value: p.id,
                label: p.name,
                hint: [p.team && `Team ${p.team}`, p.squad].filter(Boolean).join(" · "),
              }))}
              onChange={pickPd}
              placeholder="ทุก Producer"
              emptyLabel="ทุก Producer"
              ariaLabel="กรองตาม Producer"
              className="w-full rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink outline-none"
            />
          </div>
          {isPd && data.producerId !== data.ownProducerId && (
            <button type="button" onClick={() => pickPd(data.ownProducerId!)} className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white">
              ดูของฉัน
            </button>
          )}
          <select value={data.team ?? ""} onChange={(e) => go({ team: e.target.value || null })} aria-label="กรองตาม Team" className={select}>
            <option value="">ทุก Team</option>
            {data.teams.map((t) => (
              <option key={t} value={t}>
                Team {t}
              </option>
            ))}
          </select>
          <select value={data.squad ?? ""} onChange={(e) => go({ squad: e.target.value || null })} aria-label="กรองตาม Squad" className={select}>
            <option value="">ทุก Squad</option>
            {data.squads.map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
          {(filtering || data.roomId) && (
            <Link
              href={href({ brand: null, channel: null, room: null, team: null, squad: null, pd: isPd ? "all" : null })}
              className="text-[11px] text-accent hover:underline"
            >
              ล้างตัวกรอง
            </Link>
          )}
        </div>
      </section>

      {pdName && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
          <span className="font-semibold">ตารางของ {pdName}</span>
          <span className="text-soft">
            {" "}
            · {title} · {data.liveCount} ไลฟ์ · {Math.round((data.liveMinutes / 60) * 10) / 10} ชั่วโมง
          </span>
        </p>
      )}

      <div className={`grid grid-cols-[minmax(0,1fr)] gap-4 ${selected ? "xl:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
        <div className="min-w-0">
          {data.view === "month" && (
            <MonthGrid month={data.date.slice(0, 7)} today={data.today} summaries={data.summaries} dayHref={(date) => href({ view: "day", date })} />
          )}
          {data.view === "week" && (
            <WeekTimeline from={data.from} today={data.today} slots={data.slots} colors={colors} onSelect={setSelected} dayHref={(date) => href({ view: "day", date })} />
          )}
          {data.view === "day" && (
            <DayTimeline
              date={data.date}
              rows={visibleRows}
              rowLabel={byPd ? "Producer" : "ห้อง"}
              slotCount={data.slots.length}
              colors={colors}
              blockDetail={(s) => (byPd ? `${s.roomName} · ${s.mcName ?? "รอ MC"}` : (s.mcName ?? "รอ MC"))}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onAdd={null}
              emptyText={byPd ? "ไม่มี Producer เข้ากะ/มีไลฟ์ในวันนี้ตามตัวกรอง" : "ไม่มีห้องใน Room Database"}
            />
          )}
        </div>
        {selected && (
          <SlotDetail slot={selected} roomColor={colors[selected.roomId]} role={role} canEdit={false} onEdit={() => {}} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
