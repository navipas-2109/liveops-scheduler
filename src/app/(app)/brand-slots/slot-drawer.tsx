"use client";

import { CircleAlert, CircleCheck, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Brand, Room } from "@/application/ports";
import type { RoomClash } from "@/application/slots/check-room";
import { fromLiveMinutes } from "@/domain/time";
import { TIME_CHOICES, timeRange } from "../../format";
import { checkRoomAction, deleteSlotAction, saveSlotAction, type SlotFormValues } from "./actions";

const CAMPAIGNS = ["Regular Live", "Flash Sale", "Brand Day", "Mega Campaign", "New Launch", "Collab Special"];

const field =
  "w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-[13px] text-ink outline-none " +
  "focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-60";

interface Props {
  initial: SlotFormValues;
  brands: Brand[];
  rooms: Room[];
  onClose: () => void;
}

type RoomCheck = { state: "idle" | "checking" } | { state: "done"; clashes: RoomClash[] };

// Slide-in form for adding or editing a slot, with a live room check.
export function SlotDrawer({ initial, brands, rooms, onClose }: Props) {
  const initialBrand = brands.find((b) => b.id === initial.brandId);
  const [values, setValues] = useState(initial);
  const [brandName, setBrandName] = useState(initialBrand?.brandName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [roomCheck, setRoomCheck] = useState<RoomCheck>({ state: "idle" });

  const brandNames = [...new Set(brands.map((b) => b.brandName))];
  const platforms = brands.filter((b) => b.brandName === brandName);
  const set = (changes: Partial<SlotFormValues>) => setValues((v) => ({ ...v, ...changes }));

  function pickBrand(name: string) {
    setBrandName(name);
    const options = brands.filter((b) => b.brandName === name);
    // Fill the platform automatically when the brand only has one.
    set({ brandId: options.length === 1 ? options[0].id : "" });
  }

  const { date, roomId, startMinute, endMinute, id } = values;
  useEffect(() => {
    if (!date || !roomId || endMinute <= startMinute) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setRoomCheck({ state: "checking" });
      const clashes = await checkRoomAction({ date, roomId, startMinute, endMinute, excludeId: id });
      if (!cancelled) setRoomCheck({ state: "done", clashes });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [date, roomId, startMinute, endMinute, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const timeError = endMinute <= startMinute ? "เวลาจบต้องหลังเวลาเริ่ม" : null;
  const roomTaken = roomCheck.state === "done" && roomCheck.clashes.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.brandId) return setError("กรุณาเลือกแบรนด์และแพลตฟอร์ม");
    setPending(true);
    setError(null);
    const result = await saveSlotAction(values);
    setPending(false);
    if (result.ok) onClose();
    else setError(result.error);
  }

  async function remove() {
    if (!id || !window.confirm("ลบสล็อตนี้?")) return;
    setPending(true);
    const result = await deleteSlotAction(id);
    setPending(false);
    if (result.ok) onClose();
    else setError(result.error);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <form
        onSubmit={submit}
        className="relative flex h-full w-full max-w-[420px] flex-col border-l border-line-strong bg-panel shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">{id ? "แก้ไข Brand Slot" : "เพิ่ม Brand Slot ใหม่"}</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">แบรนด์</span>
              <select value={brandName} onChange={(e) => pickBrand(e.target.value)} className={field} required>
                <option value="">เลือกแบรนด์</option>
                {brandNames.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">แพลตฟอร์ม</span>
              <select
                value={values.brandId}
                onChange={(e) => set({ brandId: e.target.value })}
                disabled={!brandName}
                className={field}
                required
              >
                <option value="">{brandName ? "เลือกแพลตฟอร์ม" : "—"}</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.platform}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">วันที่</span>
            <input type="date" value={date} onChange={(e) => set({ date: e.target.value })} className={field} required />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">ห้อง</span>
            <select value={roomId} onChange={(e) => set({ roomId: e.target.value })} className={field}>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.building} F{r.floor} · {r.shortName}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">เวลาเริ่ม</span>
              <select value={startMinute} onChange={(e) => set({ startMinute: Number(e.target.value) })} className={field}>
                {TIME_CHOICES.slice(0, -1).map((m) => (
                  <option key={m} value={m}>
                    {fromLiveMinutes(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">เวลาจบ</span>
              <select value={endMinute} onChange={(e) => set({ endMinute: Number(e.target.value) })} className={field}>
                {TIME_CHOICES.slice(1).map((m) => (
                  <option key={m} value={m}>
                    {fromLiveMinutes(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <RoomStatus check={roomCheck} timeError={timeError} />

          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">แคมเปญ (ถ้ามี)</span>
            <select value={values.campaign} onChange={(e) => set({ campaign: e.target.value })} className={field}>
              <option value="">—</option>
              {CAMPAIGNS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">Requirement</span>
            <textarea
              value={values.requirement}
              onChange={(e) => set({ requirement: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder="เช่น Beauty, ต้องการ MC ผู้หญิง, พูดภาษาอังกฤษได้"
              className={`${field} resize-none placeholder:text-muted`}
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-conflict-fg/30 bg-conflict-bg px-3 py-2 text-xs text-conflict-fg">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-4">
          {id && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-conflict-fg hover:bg-conflict-bg"
            >
              <Trash2 size={14} /> ลบ
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto rounded-lg px-4 py-2 text-xs font-medium text-soft hover:text-ink">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={pending || roomTaken || !!timeError}
            className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RoomStatus({ check, timeError }: { check: RoomCheck; timeError: string | null }) {
  if (timeError) {
    return <Notice tone="bad">{timeError}</Notice>;
  }
  if (check.state !== "done") {
    return <p className="text-[11px] text-muted">กำลังตรวจสอบห้อง…</p>;
  }
  if (check.clashes.length === 0) {
    return <Notice tone="good">ห้องว่างช่วงเวลานี้</Notice>;
  }
  return (
    <Notice tone="bad">
      ห้องนี้ถูกจองแล้ว:{" "}
      {check.clashes.map((c) => `${c.brandName} ${timeRange(c.startMinute, c.endMinute)}`).join(", ")}
    </Notice>
  );
}

function Notice({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  const Icon = tone === "good" ? CircleCheck : CircleAlert;
  return (
    <p
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
        tone === "good" ? "bg-confirmed-bg text-confirmed-fg" : "bg-conflict-bg text-conflict-fg"
      }`}
    >
      <Icon size={14} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}
