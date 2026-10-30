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
import { DayTimeline } from "./day-timeline";
import { MonthGrid } from "./month-grid";
import { roomColors, type TimelineRow } from "./schedule-shared";
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

// Read-only schedule by room, filterable by room, brand and channel. Slots
// are entered on Input Live Slot.
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

  const dayRows: TimelineRow[] = (data.roomId ? data.rooms.filter((r) => r.id === data.roomId) : data.rooms).map(
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
  // With a brand or channel filter, only rooms that have its lives are worth showing.
  const filtering = !!(data.brandName || data.platform);
  const visibleRows = filtering ? dayRows.filter((r) => r.slots.length > 0) : dayRows;

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
                {r.building === "Witree" ? "WT" : "RS"} F{r.floor} · {r.shortName}
              </option>
            ))}
          </select>
          {(filtering || data.roomId) && (
            <Link href={href({ brand: null, channel: null, room: null })} className="text-[11px] text-accent hover:underline">
              ล้างตัวกรอง
            </Link>
          )}
        </div>
      </section>

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
              rowLabel="ห้อง"
              slotCount={data.slots.length}
              colors={colors}
              blockDetail={(s) => s.mcName ?? "รอ MC"}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onAdd={null}
              emptyText={filtering ? "ไม่มีไลฟ์ของแบรนด์/Channel นี้ในวันนี้" : "ไม่มีห้อง"}
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
