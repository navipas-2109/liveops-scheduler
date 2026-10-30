"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Room, RoomInput } from "@/application/ports";
import { deleteRoomAction, saveRoomAction } from "./actions";

const BUILDINGS = ["Ripples Studio", "Witree"];

type Draft = RoomInput & { id?: string };

export function RoomsView({ rooms }: { rooms: Room[] }) {
  const [building, setBuilding] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const visible = rooms.filter((r) => !building || r.building === building);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {[null, ...BUILDINGS].map((b) => (
              <button
                key={b ?? "all"}
                type="button"
                onClick={() => setBuilding(b)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  building === b ? "bg-primary/15 text-accent" : "text-muted hover:bg-field hover:text-soft"
                }`}
              >
                {b ?? "ทั้งหมด"} ({b ? rooms.filter((r) => r.building === b).length : rooms.length})
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDraft({ building: building ?? BUILDINGS[0], floor: 1, roomNo: "", size: "Small", brandAssignment: "" })}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
          >
            <Plus size={14} /> เพิ่มห้อง
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-semibold">อาคาร</th>
                <th className="px-3 py-2 font-semibold">ชั้น</th>
                <th className="px-3 py-2 font-semibold">ห้อง</th>
                <th className="px-3 py-2 font-semibold">ขนาด</th>
                <th className="px-3 py-2 font-semibold">แบรนด์ประจำห้อง</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-line/60 hover:bg-field/50">
                  <td className="px-4 py-2 text-soft">{r.building}</td>
                  <td className="px-3 py-2 tabular-nums">F{r.floor}</td>
                  <td className="px-3 py-2 font-semibold">{r.roomNo}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        r.size === "Large" ? "bg-completed-bg text-completed-fg" : "bg-line text-soft"
                      }`}
                    >
                      {r.size}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-muted">{r.brandAssignment || "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setDraft({ ...r })}
                      aria-label={`แก้ไข ${r.roomNo}`}
                      className="rounded-md p-1.5 text-muted hover:bg-field hover:text-ink"
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="px-4 py-8 text-center text-xs text-muted">ยังไม่มีห้อง</p>}
        </div>
      </section>

      {draft && <RoomDrawer key={draft.id ?? "new"} initial={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}

function RoomDrawer({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (changes: Partial<Draft>) => setValues((v) => ({ ...v, ...changes }));
  const field =
    "w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { building, floor, roomNo, size, brandAssignment } = values;
    const r = await saveRoomAction({ building, floor, roomNo, size, brandAssignment }, initial.id);
    setPending(false);
    if (r.ok) onClose();
    else setError(r.error);
  }

  async function remove() {
    if (!initial.id || !window.confirm(`ลบห้อง ${initial.roomNo}?`)) return;
    setPending(true);
    setError(null);
    const r = await deleteRoomAction(initial.id);
    setPending(false);
    if (r.ok) onClose();
    else setError(r.error);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <form onSubmit={save} className="relative flex h-full w-full max-w-[400px] flex-col border-l border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">{initial.id ? "แก้ไขห้อง" : "เพิ่มห้อง"}</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">อาคาร</span>
              <select value={values.building} onChange={(e) => set({ building: e.target.value })} className={field}>
                {BUILDINGS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">ชั้น</span>
              <input
                type="number"
                min={0}
                max={50}
                value={values.floor}
                onChange={(e) => set({ floor: Number(e.target.value) })}
                required
                className={`${field} tabular-nums`}
              />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">ชื่อ / เลขห้อง</span>
            <input
              value={values.roomNo}
              onChange={(e) => set({ roomNo: e.target.value })}
              placeholder="เช่น R-301"
              required
              className={`${field} placeholder:text-muted`}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">ขนาด</span>
            <select value={values.size} onChange={(e) => set({ size: e.target.value })} className={field}>
              <option>Large</option>
              <option>Small</option>
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">แบรนด์ประจำห้อง (ถ้ามี)</span>
            <input
              value={values.brandAssignment}
              onChange={(e) => set({ brandAssignment: e.target.value })}
              placeholder="เช่น Adidas"
              className={`${field} placeholder:text-muted`}
            />
          </label>
          {error && <p role="alert" className="rounded-lg bg-conflict-bg px-3 py-2 text-xs text-conflict-fg">{error}</p>}
        </div>
        <div className="flex items-center gap-2 border-t border-line px-5 py-4">
          {initial.id && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-conflict-fg hover:bg-conflict-bg"
            >
              <Trash2 size={14} /> ลบห้อง
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto rounded-lg px-4 py-2 text-xs font-medium text-soft hover:text-ink">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}
