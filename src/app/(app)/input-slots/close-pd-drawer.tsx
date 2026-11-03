"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Producer, ShiftItem } from "@/application/ports";
import { fromLiveMinutes, LIVE_DAY_END, LIVE_DAY_START } from "@/domain/time";
import { TIME_CHOICES } from "../../format";
import { closePdTimeAction } from "./actions";

const field =
  "w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-primary placeholder:text-muted";

// Planner picks PDs and a time range (one day or several) to close; no live
// can be booked with them then.
export function ClosePdDrawer({
  date,
  producers,
  shifts,
  onClose,
}: {
  date: string;
  producers: Producer[];
  shifts: ShiftItem[];
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [onShiftOnly, setOnShiftOnly] = useState(true);
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState(date);
  const [startMinute, setStart] = useState(LIVE_DAY_START);
  const [endMinute, setEnd] = useState(LIVE_DAY_END);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const working = new Set(shifts.filter((x) => x.shiftStart !== null).map((x) => x.producerId));
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = producers.filter(
    (p) =>
      (!onShiftOnly || working.has(p.id) || picked.has(p.id)) &&
      words.every((w) => `${p.name} ${p.squad} ${p.team}`.toLowerCase().includes(w)),
  );
  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await closePdTimeAction({ producerIds: [...picked], from, to, startMinute, endMinute, note });
    setPending(false);
    if (r.ok) onClose();
    else setError(r.error);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <form onSubmit={submit} className="relative flex h-full w-full max-w-[440px] flex-col border-l border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">ปิดเวลา PD</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
          <p className="text-[11px] text-muted">
            ช่วงที่ปิดจะลงสล็อตให้ PD คนนั้นไม่ได้ (ทุกคนรวม AE) · เปิดคืนได้โดยคลิกแถบ “⛔ ปิด” ในตาราง
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">ตั้งแต่วันที่</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required aria-label="ตั้งแต่วันที่" className={field} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">ถึงวันที่</span>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required aria-label="ถึงวันที่" className={field} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">เวลาเริ่ม</span>
              <select value={startMinute} onChange={(e) => setStart(Number(e.target.value))} aria-label="เวลาเริ่มปิด" className={field}>
                {TIME_CHOICES.slice(0, -1).map((m) => (
                  <option key={m} value={m}>
                    {fromLiveMinutes(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">เวลาจบ</span>
              <select value={endMinute} onChange={(e) => setEnd(Number(e.target.value))} aria-label="เวลาจบปิด" className={field}>
                {TIME_CHOICES.slice(1).map((m) => (
                  <option key={m} value={m}>
                    {fromLiveMinutes(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">เหตุผล (ถ้ามี)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="เช่น อบรม, ประชุม, ดูแลงานอื่น" className={field} />
          </label>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-soft">เลือก PD ({picked.size})</span>
              <label className="flex items-center gap-1.5 text-[11px] text-soft">
                <input type="checkbox" checked={onShiftOnly} onChange={(e) => setOnShiftOnly(e.target.checked)} />
                เฉพาะคนที่เข้ากะวันนี้
              </label>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-line-strong bg-field px-2.5 py-1.5 text-muted">
              <Search size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ / Squad / Team"
                aria-label="ค้นหา PD"
                className="flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
              />
            </label>
            <ul className="max-h-[40vh] overflow-y-auto rounded-lg border border-line">
              {shown.map((p) => (
                <li key={p.id} className="border-b border-line/60 last:border-0">
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-field">
                    <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} aria-label={`เลือก ${p.name}`} />
                    <span className="font-semibold">{p.name}</span>
                    <span className="truncate text-[10px] text-muted">
                      {[p.team && `Team ${p.team}`, p.squad].filter(Boolean).join(" · ")}
                    </span>
                  </label>
                </li>
              ))}
              {shown.length === 0 && <li className="px-3 py-4 text-center text-xs text-muted">ไม่พบ PD</li>}
            </ul>
          </div>
          {error && <p role="alert" className="rounded-lg bg-conflict-bg px-3 py-2 text-xs text-conflict-fg">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-soft hover:text-ink">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={pending || picked.size === 0}
            className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            ปิดเวลา {picked.size} คน
          </button>
        </div>
      </form>
    </div>
  );
}
