"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { SlotListItem } from "@/application/ports";
import type { SchedulePageData, ScheduleView } from "@/application/slots/get-schedule-page";
import { checkBookingAllowed } from "@/domain/booking";
import type { Role } from "@/domain/roles";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { dayLabel, monthLabel, shortDateLabel, STATUS_META, STATUS_ORDER } from "../../format";
import type { SlotFormValues } from "../brand-slots/actions";
import { SlotDrawer } from "../brand-slots/slot-drawer";
import { DayTimeline } from "./day-timeline";
import { MonthGrid } from "./month-grid";
import { roomColors } from "./schedule-shared";
import { SlotDetail } from "./slot-detail";
import { WeekTimeline } from "./week-timeline";

interface Props {
  data: SchedulePageData;
  role: Role;
  userId: string;
}

const VIEW_LABEL: Record<ScheduleView, string> = { month: "เดือน", week: "สัปดาห์", day: "วัน" };

function shift(view: ScheduleView, date: string, dir: number): string {
  const d = fromIsoDate(date);
  if (view === "day") d.setUTCDate(d.getUTCDate() + dir);
  else if (view === "week") d.setUTCDate(d.getUTCDate() + 7 * dir);
  else d.setUTCMonth(d.getUTCMonth() + dir, 1);
  return toIsoDate(d);
}

export function ScheduleScreen({ data, role, userId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<SlotListItem | null>(null);
  const [form, setForm] = useState<SlotFormValues | null>(null);

  const href = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    return `${pathname}?${params.toString()}`;
  };
  const colors = roomColors(data.rooms);
  const canBookOn = (date: string) =>
    data.brands.length > 0 && checkBookingAllowed(role, data.windows, date, data.today).ok;

  function addAt(date: string, roomId: string | null, startMinute: number) {
    setSelected(null);
    setForm({
      date,
      startMinute,
      endMinute: startMinute + 120,
      roomId: roomId ?? data.rooms[0]?.id ?? "",
      brandId: "",
      campaign: "",
      requirement: "",
    });
  }

  const title =
    data.view === "day"
      ? dayLabel(data.date)
      : data.view === "week"
        ? `${shortDateLabel(data.from)} – ${shortDateLabel(data.to)}`
        : monthLabel(data.date.slice(0, 7));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
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
          <Link
            href={href({ date: shift(data.view, data.date, -1) })}
            aria-label="ก่อนหน้า"
            className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field"
          >
            <ChevronLeft size={14} />
          </Link>
          <Link
            href={href({ date: shift(data.view, data.date, 1) })}
            aria-label="ถัดไป"
            className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field"
          >
            <ChevronRight size={14} />
          </Link>
          <Link href={href({ date: null })} className="rounded-md border border-line-strong px-2.5 py-1 text-xs text-soft hover:bg-field">
            วันนี้
          </Link>
          <span className="text-sm font-semibold">{title}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={data.roomId ?? ""}
            onChange={(e) => router.replace(href({ room: e.target.value || null }), { scroll: false })}
            aria-label="กรองตามห้อง"
            className="max-w-[220px] rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink outline-none"
          >
            <option value="">ทุกห้อง ({data.rooms.length})</option>
            {data.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.building === "Witree" ? "WT" : "RS"} F{r.floor} · {r.shortName}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2.5">
            {STATUS_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-1 text-[10px] text-soft">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className={`grid grid-cols-[minmax(0,1fr)] gap-4 ${selected ? "xl:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
        <div className="min-w-0">
          {data.view === "month" && (
            <MonthGrid
              month={data.date.slice(0, 7)}
              today={data.today}
              summaries={data.summaries}
              dayHref={(date) => href({ view: "day", date })}
            />
          )}
          {data.view === "week" && (
            <WeekTimeline
              from={data.from}
              today={data.today}
              slots={data.slots}
              colors={colors}
              onSelect={setSelected}
              dayHref={(date) => href({ view: "day", date })}
            />
          )}
          {data.view === "day" && (
            <DayTimeline
              date={data.date}
              rooms={data.roomId ? data.rooms.filter((r) => r.id === data.roomId) : data.rooms}
              slots={data.slots}
              colors={colors}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onAdd={canBookOn(data.date) ? (roomId, minute) => addAt(data.date, roomId, minute) : null}
            />
          )}
        </div>

        {selected && (
          <SlotDetail
            slot={selected}
            roomColor={colors[selected.roomId]}
            role={role}
            canEdit={
              selected.status !== "completed" &&
              canBookOn(selected.date) &&
              (role === "MANAGER" || selected.aeId === userId)
            }
            onEdit={() => {
              setForm({
                id: selected.id,
                date: selected.date,
                startMinute: selected.startMinute,
                endMinute: selected.endMinute,
                roomId: selected.roomId,
                brandId: selected.brandId,
                campaign: selected.campaign,
                requirement: selected.requirement,
              });
              setSelected(null);
            }}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      {form && (
        <SlotDrawer key={form.id ?? "new"} initial={form} brands={data.brands} rooms={data.rooms} onClose={() => setForm(null)} />
      )}
    </div>
  );
}
