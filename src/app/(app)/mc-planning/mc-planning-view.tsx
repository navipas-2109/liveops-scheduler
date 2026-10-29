"use client";

import { ChevronLeft, ChevronRight, CircleAlert, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { SlotListItem } from "@/application/ports";
import type { McPlanningPageData } from "@/application/slots/get-mc-planning-page";
import { isStaffReady } from "@/domain/slot-rules";
import { dayLabel, monthLabel, shiftMonth, STATUS_META, STATUS_ORDER, timeRange } from "../../format";
import { BookingBanner } from "../booking-banner";
import { StatusBadge } from "../status-badge";
import { AssignDrawer } from "./assign-drawer";

export function McPlanningView({ data }: { data: McPlanningPageData }) {
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
  const total = Object.values(data.counts).reduce((a, b) => a + (b ?? 0), 0);

  // Group the list by date so a long month stays readable.
  const byDate = new Map<string, SlotListItem[]>();
  for (const s of data.slots) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <BookingBanner
        window={data.bannerWindow}
        open={data.bannerOpen}
        canEdit={data.canAssign}
        today={data.today}
      />

      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {[null, ...STATUS_ORDER].map((s) => {
              const active = data.status === s;
              const count = s ? (data.counts[s] ?? 0) : total;
              return (
                <Link
                  key={s ?? "all"}
                  href={href({ status: s ?? "all" })}
                  scroll={false}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                    active ? "bg-primary/15 text-accent" : "text-muted hover:bg-field hover:text-soft"
                  }`}
                >
                  {s ? STATUS_META[s].label : "ทั้งหมด"}
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      s === "conflict" && count > 0
                        ? "bg-conflict-bg text-conflict-fg"
                        : s === "waiting" && count > 0
                          ? "bg-waiting-bg text-waiting-fg"
                          : "bg-field text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={data.day ?? ""}
              min={`${data.month}-01`}
              max={`${data.month}-31`}
              onChange={(e) => router.replace(href({ day: e.target.value || null }), { scroll: false })}
              aria-label="เลือกวัน"
              className="rounded-md border border-line-strong bg-field px-2 py-1 text-xs text-ink outline-none"
            />
            {data.day && (
              <Link href={href({ day: null })} className="text-[11px] text-accent hover:underline">
                ทั้งเดือน
              </Link>
            )}
            <div className="flex items-center gap-1">
              <Link
                href={href({ month: shiftMonth(data.month, -1), day: null })}
                aria-label="เดือนก่อน"
                className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field"
              >
                <ChevronLeft size={14} />
              </Link>
              <span className="min-w-[120px] text-center text-xs font-semibold">{monthLabel(data.month)}</span>
              <Link
                href={href({ month: shiftMonth(data.month, 1), day: null })}
                aria-label="เดือนถัดไป"
                className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field"
              >
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {data.slots.length === 0 ? (
          <p className="px-4 py-12 text-center text-xs text-muted">ไม่มีสล็อตในตัวกรองนี้</p>
        ) : (
          <div className="divide-y divide-line">
            {[...byDate.entries()].map(([date, slots]) => (
              <div key={date}>
                <p className="sticky top-[60px] z-10 bg-card/95 px-4 py-2 text-[11px] font-semibold text-soft backdrop-blur">
                  {dayLabel(date)} <span className="font-normal text-muted">· {slots.length} สล็อต</span>
                </p>
                <ul>
                  {slots.map((s) => (
                    <SlotRow
                      key={s.id}
                      slot={s}
                      canAssign={data.canAssign}
                      onOpen={() => setSelected(s)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {data.slots.length >= data.limit && (
          <p className="px-4 py-2 text-center text-[10px] text-muted">
            แสดง {data.limit} รายการแรก — เลือกวันเพื่อดูเพิ่ม
          </p>
        )}
      </section>

      {selected && <AssignDrawer key={selected.id} slot={selected} mcs={data.mcs} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SlotRow({ slot, canAssign, onOpen }: { slot: SlotListItem; canAssign: boolean; onOpen: () => void }) {
  const ready = isStaffReady(slot);
  const clickable = canAssign && slot.status !== "completed";
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={!clickable}
        className="grid w-full grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left text-xs enabled:hover:bg-field disabled:cursor-default sm:grid-cols-[88px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <span className="font-semibold tabular-nums">{timeRange(slot.startMinute, slot.endMinute)}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {slot.brandName} <span className="font-normal text-muted">({slot.platform})</span>
          </span>
          <span className="block truncate text-muted sm:hidden">{slot.roomName}</span>
          {slot.requirement && <span className="block truncate text-[11px] text-muted">{slot.requirement}</span>}
        </span>
        <span className="hidden min-w-0 truncate text-soft sm:block">
          {slot.roomName}
          <span className="block truncate text-[11px] text-muted">AE {slot.aeName}</span>
        </span>
        <span className="hidden min-w-0 sm:block">
          {slot.mcName ? (
            <span className="font-semibold">🎙️ {slot.mcName}</span>
          ) : (
            <span className="text-waiting-fg">ยังไม่มี MC</span>
          )}
          <span className={`block text-[10px] ${ready ? "text-muted" : "text-waiting-fg"}`}>
            ทีมงาน{ready ? "พร้อม" : "ไม่พร้อม"}
          </span>
        </span>
        <span className="flex items-center justify-end gap-2">
          {slot.status === "conflict" && <CircleAlert size={14} className="text-conflict-fg" />}
          <StatusBadge status={slot.status} />
          {clickable && <UserRoundPlus size={14} className="hidden text-muted sm:block" />}
        </span>
      </button>
    </li>
  );
}
