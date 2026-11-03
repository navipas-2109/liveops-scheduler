"use client";

import { Ban, ChevronLeft, ChevronRight, Lock, LockOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { SlotListItem } from "@/application/ports";
import type { InputPageData } from "@/application/slots/get-input-page";
import { LOCKED_MESSAGE } from "@/domain/slot-lock";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { dayLabel, monthLabel, timeRange } from "../../format";
import type { SlotFormValues } from "../brand-slots/actions";
import { SlotDrawer } from "../brand-slots/slot-drawer";
import { DayTimeline, type ClosedRange } from "../schedule/day-timeline";
import {
  pdRows,
  roomColors,
  type TimelineRow,
} from "../schedule/schedule-shared";
import { BookingBanner } from "../booking-banner";
import { confirmReadyAction } from "../brand-check/actions";
import { CheckBadge, hrs } from "../brand-check/check-status";
import { reopenPdTimeAction, setBrandLockAction } from "./actions";
import { ClosePdDrawer } from "./close-pd-drawer";

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
  const [closing, setClosing] = useState(false);
  const [team, setTeam] = useState("");

  const closed: Record<string, ClosedRange[]> = {};
  for (const b of data.closed) (closed[b.producerId] ??= []).push(b);
  async function onClosed(c: ClosedRange) {
    const what = `${c.producerName} ${timeRange(c.startMinute, c.endMinute)}${c.note ? ` (${c.note})` : ""}`;
    if (!data.canClosePd)
      return setNotice(
        `ช่วงนี้ Planner ปิดเวลาของ ${what} — ลง PD คนนี้ไม่ได้`,
      );
    if (!window.confirm(`เปิดเวลาของ ${what} ให้ลงสล็อตได้อีกครั้ง?`)) return;
    const r = await reopenPdTimeAction([c.id]);
    setNotice(r.ok ? null : r.error);
  }

  const colors = roomColors(data.rooms);
  const locked = new Set(data.lockedBrandIds);
  const isLocked = (s: SlotListItem) => locked.has(s.brandId);
  const byId = new Map(data.producers.map((p) => [p.id, p]));
  // Only PDs on the day's shift (from Producer Shift) get a row; the
  // "no PD yet" row stays so unassigned lives can be fixed.
  const allRows = pdRows(data.slots, data.shifts);
  const rows = allRows.filter(
    (r) =>
      (r.shift !== null || !r.producerId) &&
      (!squad || !r.producerId || (byId.get(r.producerId)?.squad ?? r.squad ?? "") === squad) &&
      (!team || !r.producerId || byId.get(r.producerId)?.team === team),
  );
  // Lives booked with someone who isn't on shift that day.
  const offShift = allRows
    .filter((r) => r.shift === null && r.producerId)
    .flatMap((r) => r.slots.map((slot) => ({ slot, pd: r.title })));
  const onShift = new Set(data.shifts.filter((x) => x.shiftStart !== null).map((x) => x.producerId));
  const shiftSquads = [...new Set(data.shifts.filter((x) => x.shiftStart !== null).map((x) => x.squad).filter(Boolean))].sort();
  const shiftTeams = [...new Set([...onShift].map((id) => byId.get(id)?.team).filter((t): t is string => !!t))].sort();

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
      secondPdId: null,
    });
  }

  function open(s: SlotListItem) {
    if (s.status === "completed")
      return setNotice("ไลฟ์นี้จบและบันทึกแล้ว แก้ไขไม่ได้");
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
      secondPdId: s.admin1Id,
    });
  }

  async function unlock(brandId: string, name: string) {
    if (!window.confirm(`ปลดล็อก ${name} เดือน ${monthLabel(data.month)}?`))
      return;
    const r = await setBrandLockAction(brandId, data.month, false);
    setNotice(r.ok ? null : r.error);
  }

  const ready = data.checks.filter((c) => c.status === "ready");
  async function confirmAll() {
    const names = ready.map((c) => `${c.brandName} (${c.platform})`).join("\n");
    if (
      !window.confirm(
        `ยืนยันและล็อกสล็อต ${ready.length} แบรนด์ เดือน ${monthLabel(data.month)}?\n\n${names}\n\nหลังยืนยัน แก้ไขได้เฉพาะ Planner`,
      )
    )
      return;
    const r = await confirmReadyAction(data.month);
    setNotice(r.ok ? null : r.error);
  }
  const lockedCount = data.checks.filter((c) => c.lock).length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`${pathname}?date=${shiftDay(data.date, -1)}`}
            aria-label="วันก่อน"
            className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field"
          >
            <ChevronLeft size={14} />
          </Link>
          <Link
            href={`${pathname}?date=${shiftDay(data.date, 1)}`}
            aria-label="วันถัดไป"
            className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field"
          >
            <ChevronRight size={14} />
          </Link>
          <Link
            href={pathname}
            className="rounded-md border border-line-strong px-2.5 py-1 text-xs text-soft hover:bg-field"
          >
            วันนี้
          </Link>
          <input
            type="date"
            value={data.date}
            onChange={(e) =>
              e.target.value &&
              router.replace(`${pathname}?date=${e.target.value}`)
            }
            aria-label="เลือกวัน"
            className="rounded-md border border-line-strong bg-field px-2 py-1 text-xs text-ink outline-none"
          />
          <span className="text-sm font-semibold">{dayLabel(data.date)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.canClosePd && (
            <button
              type="button"
              onClick={() => setClosing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-soft hover:bg-field"
            >
              <Ban size={13} /> ปิดเวลา PD
            </button>
          )}
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            aria-label="Team"
            className="rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink outline-none"
          >
            <option value="">ทุก Team</option>
            {shiftTeams.map((t) => (
              <option key={t} value={t}>
                Team {t}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[11px] text-muted">
            Brand Squad
            <select
              value={squad}
              onChange={(e) => setSquad(e.target.value)}
              className="max-w-[240px] rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink outline-none"
            >
              <option value="">ทุก Squad</option>
              {shiftSquads.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <BookingBanner
        window={data.window}
        open={data.windowOpen}
        canEdit={data.canSetWindow}
        today={data.today}
        month={data.month}
      />

      {!data.shiftsConfirmed && (
        <p className="rounded-lg border border-waiting-fg/30 bg-waiting-bg px-3 py-2 text-xs text-waiting-fg">
          กะ Producer เดือน {monthLabel(data.month)} ยังไม่ยืนยัน — AE
          จะลงสล็อตได้หลัง Planner กด “ยืนยันกะเดือนนี้” ที่หน้า Producer Shift
        </p>
      )}

      {offShift.length > 0 && (
        <div className="rounded-lg border border-waiting-fg/30 bg-waiting-bg px-3 py-2 text-xs text-waiting-fg">
          <p className="font-semibold">มี {offShift.length} สล็อตที่ลง PD ซึ่งไม่มีกะวันนี้ — คลิกเพื่อแก้ PD</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {offShift.map(({ slot, pd }) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => open(slot)}
                className="rounded-md bg-black/10 px-2 py-0.5 text-[11px] hover:bg-black/20"
              >
                {pd} · {slot.brandName} {timeRange(slot.startMinute, slot.endMinute)}
              </button>
            ))}
          </div>
        </div>
      )}

      {notice && (
        <p
          role="alert"
          className="rounded-lg border border-conflict-fg/30 bg-conflict-bg px-3 py-2 text-xs text-conflict-fg"
        >
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
            closed={closed}
            onClosed={onClosed}
            emptyText="วันนี้ยังไม่มีกะ PD — นำเข้ากะได้ที่หน้า Producer Shift"
          />
          <p className="mt-2 text-[11px] text-muted">
            คลิกช่องเวลาในแถวของ PD เพื่อลงสล็อตให้ PD คนนั้น ·
            คลิกสล็อตเพื่อแก้ไข · 🔒 = แบรนด์ล็อกแล้ว
          </p>
        </div>

        <section className="grid content-start gap-2 rounded-xl border border-line bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">
              ยืนยันสล็อต · {monthLabel(data.month)}
            </h2>
            <p className="text-[11px] text-muted">
              ยืนยันแล้ว {lockedCount}/{data.checks.length} แบรนด์ ·
              ยืนยันได้เมื่อชั่วโมงครบตาม Plan และ Planner Approve แล้ว
            </p>
          </div>
          <button
            type="button"
            onClick={confirmAll}
            disabled={ready.length === 0}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock size={13} /> ยืนยันสล็อตทั้งหมดที่พร้อม ({ready.length})
          </button>
          <Link
            href={`/brand-check?month=${data.month}`}
            className="text-center text-[11px] text-accent hover:underline"
          >
            ดูรายละเอียดชั่วโมง / Plan ใน Brand Slot Check →
          </Link>
          {data.checks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-muted">
              ยังไม่มี Plan หรือสล็อตในเดือนนี้
            </p>
          ) : (
            <ul className="grid max-h-[520px] gap-1.5 overflow-y-auto pr-1">
              {data.checks.map((c) => {
                const name = `${c.brandName} (${c.platform})`;
                return (
                  <li
                    key={c.brandId}
                    className="flex items-center justify-between gap-2 rounded-lg bg-field px-3 py-2 text-xs"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {c.brandName}{" "}
                        <span className="font-normal text-muted">
                          ({c.platform})
                        </span>
                      </span>
                      <span className="block text-[10px] tabular-nums text-muted">
                        ลงแล้ว {hrs(c.inputMinutes)} / Plan{" "}
                        {c.planMinutes === null ? "—" : hrs(c.planMinutes)} ชม.
                        {c.lock && ` · โดย ${c.lock.lockedByName}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <CheckBadge status={c.status} />
                      {c.lock && data.canChangeLocked && (
                        <button
                          type="button"
                          onClick={() => unlock(c.brandId, name)}
                          aria-label={`ปลดล็อก ${name}`}
                          className="rounded-md p-1 text-soft hover:bg-card"
                        >
                          <LockOpen size={12} />
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {closing && (
        <ClosePdDrawer
          date={data.date}
          producers={data.producers}
          shifts={data.shifts}
          onClose={() => setClosing(false)}
        />
      )}
      {form && (
        <SlotDrawer
          key={form.id ?? `new-${form.producerId}-${form.startMinute}`}
          initial={form}
          brands={
            data.canChangeLocked
              ? data.brands
              : data.brands.filter((b) => !locked.has(b.id))
          }
          rooms={data.rooms}
          producers={data.producers.filter(
            (p) => onShift.has(p.id) || p.id === form.producerId || p.id === form.secondPdId,
          )}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
