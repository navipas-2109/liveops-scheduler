"use client";

import { ChevronLeft, ChevronRight, Lock, LockOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { SlotListItem } from "@/application/ports";
import type { InputPageData } from "@/application/slots/get-input-page";
import { LOCKED_MESSAGE } from "@/domain/slot-lock";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { dayLabel, monthLabel } from "../../format";
import type { SlotFormValues } from "../brand-slots/actions";
import { SlotDrawer } from "../brand-slots/slot-drawer";
import { DayTimeline } from "../timeline/day-timeline";
import { pdRows, roomColors, type TimelineRow } from "../timeline/timeline-shared";
import { setBrandLockAction } from "./actions";

function shiftDay(date: string, n: number) {
  const d = fromIsoDate(date);
  d.setUTCDate(d.getUTCDate() + n);
  return toIsoDate(d);
}

// Enter the day's lives PD by PD: each row is a Producer on shift; clicking
// an hour in their row books a live with them as Producer.
export function InputScreen({ data }: { data: InputPageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [squad, setSquad] = useState("");
  const [form, setForm] = useState<SlotFormValues | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const colors = roomColors(data.rooms);
  const locked = new Set(data.lockedBrandIds);
  const isLocked = (s: SlotListItem) => locked.has(s.brandId);
  const squadOf = new Map(data.producers.map((p) => [p.id, p.squad]));
  const rows = pdRows(data.slots, data.shifts).filter(
    (r) => !squad || !r.producerId || (squadOf.get(r.producerId) ?? r.squad ?? "") === squad,
  );

  function add(row: TimelineRow, minute: number) {
    setNotice(null);
    setForm({
      date: data.date,
      startMinute: minute,
      endMinute: minute + 120,
      roomId: data.rooms[0]?.id ?? "",
      brandId: "",
      campaign: "",
      requirement: "",
      producerId: row.producerId ?? null,
    });
  }

  function open(s: SlotListItem) {
    if (s.status === "completed") return setNotice("ไลฟ์นี้จบและบันทึกแล้ว แก้ไขไม่ได้");
    if (isLocked(s) && !data.canChangeLocked) return setNotice(LOCKED_MESSAGE);
    setNotice(null);
    setForm({
      id: s.id,
      date: s.date,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
      roomId: s.roomId,
      brandId: s.brandId,
      campaign: s.campaign,
      requirement: s.requirement,
      producerId: s.producerId,
    });
  }

  async function toggleLock(brandId: string, name: string, lock: boolean) {
    const question = lock
      ? `ยืนยันและล็อกสล็อตของ ${name} ทั้งเดือน ${monthLabel(data.month)}?\nหลังล็อก แก้ไขได้เฉพาะ Planner`
      : `ปลดล็อก ${name} เดือน ${monthLabel(data.month)}?`;
    if (!window.confirm(question)) return;
    const r = await setBrandLockAction(brandId, data.month, lock);
    setNotice(r.ok ? null : r.error);
  }

  const lockedCount = data.brandMonth.filter((b) => b.lock).length;

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
        <label className="flex items-center gap-2 text-[11px] text-muted">
          Brand Squad
          <select
            value={squad}
            onChange={(e) => setSquad(e.target.value)}
            className="max-w-[240px] rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink outline-none"
          >
            <option value="">ทุก Squad</option>
            {data.squads.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </section>

      {notice && (
        <p role="alert" className="rounded-lg border border-conflict-fg/30 bg-conflict-bg px-3 py-2 text-xs text-conflict-fg">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <DayTimeline
            date={data.date}
            rows={rows}
            rowLabel="PD ที่เข้ากะ"
            slotCount={data.slots.length}
            colors={colors}
            blockDetail={(s) => s.roomName}
            selectedId={null}
            onSelect={open}
            onAdd={add}
            isLocked={isLocked}
            emptyText="วันนี้ยังไม่มีกะ PD — นำเข้ากะได้ที่หน้า Producer Shift"
          />
          <p className="mt-2 text-[11px] text-muted">
            คลิกช่องเวลาในแถวของ PD เพื่อลงสล็อตให้ PD คนนั้น · คลิกสล็อตเพื่อแก้ไข · 🔒 = แบรนด์ล็อกแล้ว
          </p>
        </div>

        <section className="grid content-start gap-2 rounded-xl border border-line bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">ยืนยันสล็อต · {monthLabel(data.month)}</h2>
            <p className="text-[11px] text-muted">
              ล็อกแล้ว {lockedCount}/{data.brandMonth.length} แบรนด์ · หลังล็อก แก้ไขได้เฉพาะ Planner
            </p>
          </div>
          {data.brandMonth.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-muted">ยังไม่มีสล็อตในเดือนนี้</p>
          ) : (
            <ul className="grid max-h-[560px] gap-1.5 overflow-y-auto pr-1">
              {data.brandMonth.map((b) => {
                const total = Object.values(b.counts).reduce((a, c) => a + (c ?? 0), 0);
                const name = `${b.brandName} (${b.platform})`;
                return (
                  <li key={b.brandId} className="flex items-center justify-between gap-2 rounded-lg bg-field px-3 py-2 text-xs">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {b.lock && "🔒 "}
                        {b.brandName} <span className="font-normal text-muted">({b.platform})</span>
                      </span>
                      <span className="block text-[10px] text-muted">
                        {total} สล็อต{b.lock && ` · ล็อกโดย ${b.lock.lockedByName}`}
                      </span>
                    </span>
                    {b.lock ? (
                      data.canChangeLocked && (
                        <button type="button" onClick={() => toggleLock(b.brandId, name, false)} className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-soft hover:bg-card">
                          <LockOpen size={12} /> ปลดล็อก
                        </button>
                      )
                    ) : (
                      <button type="button" onClick={() => toggleLock(b.brandId, name, true)} className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary-hover">
                        <Lock size={12} /> ยืนยัน & ล็อก
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {form && (
        <SlotDrawer
          key={form.id ?? `new-${form.producerId}-${form.startMinute}`}
          initial={form}
          brands={data.canChangeLocked ? data.brands : data.brands.filter((b) => !locked.has(b.id))}
          rooms={data.rooms}
          producers={data.producers}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
