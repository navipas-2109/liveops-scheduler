"use client";

import { Building2, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Building, Room, RoomInput } from "@/application/ports";
import {
  deleteBuildingAction,
  deleteRoomAction,
  saveBuildingAction,
  saveRoomAction,
} from "./actions";

type Draft = RoomInput & { id?: string };

export function RoomsView({
  rooms,
  buildings,
}: {
  rooms: Room[];
  buildings: Building[];
}) {
  const [building, setBuilding] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [managing, setManaging] = useState(false);
  const visible = rooms.filter((r) => !building || r.buildingId === building);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {managing && (
        <BuildingsPanel
          buildings={buildings}
          onClose={() => setManaging(false)}
        />
      )}
      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {[null, ...buildings].map((b) => (
              <button
                key={b?.id ?? "all"}
                type="button"
                onClick={() => setBuilding(b?.id ?? null)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  building === (b?.id ?? null)
                    ? "bg-primary/15 text-accent"
                    : "text-muted hover:bg-field hover:text-soft"
                }`}
              >
                {b?.name ?? "ทั้งหมด"} ({b ? b.roomCount : rooms.length})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setManaging((m) => !m)}
              className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs font-medium text-soft hover:bg-field"
            >
              <Building2 size={14} /> จัดการตึก
            </button>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  buildingId: building ?? buildings[0]?.id ?? "",
                  floor: 1,
                  roomNo: "",
                  size: "Small",
                  brandAssignment: "",
                })
              }
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
            >
              <Plus size={14} /> เพิ่มห้อง
            </button>
          </div>
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
                <tr
                  key={r.id}
                  className="border-b border-line/60 hover:bg-field/50"
                >
                  <td className="px-4 py-2 text-soft">{r.building}</td>
                  <td className="px-3 py-2 tabular-nums">F{r.floor}</td>
                  <td className="px-3 py-2 font-semibold">{r.roomNo}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        r.size === "Large"
                          ? "bg-completed-bg text-completed-fg"
                          : "bg-line text-soft"
                      }`}
                    >
                      {r.size}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-muted">
                    {r.brandAssignment || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          id: r.id,
                          buildingId: r.buildingId,
                          floor: r.floor,
                          roomNo: r.roomNo,
                          size: r.size,
                          brandAssignment: r.brandAssignment,
                        })
                      }
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
          {visible.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-muted">
              ยังไม่มีห้อง
            </p>
          )}
        </div>
      </section>

      {draft && (
        <RoomDrawer
          key={draft.id ?? "new"}
          initial={draft}
          buildings={buildings}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}

function RoomDrawer({
  initial,
  buildings,
  onClose,
}: {
  initial: Draft;
  buildings: Building[];
  onClose: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (changes: Partial<Draft>) =>
    setValues((v) => ({ ...v, ...changes }));
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
    const { buildingId, floor, roomNo, size, brandAssignment } = values;
    const r = await saveRoomAction(
      { buildingId, floor, roomNo, size, brandAssignment },
      initial.id,
    );
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
      <button
        type="button"
        aria-label="ปิด"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <form
        onSubmit={save}
        className="relative flex h-full w-full max-w-[400px] flex-col border-l border-line-strong bg-panel shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">
            {initial.id ? "แก้ไขห้อง" : "เพิ่มห้อง"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="rounded-md p-1 text-muted hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">อาคาร</span>
              <select
                value={values.buildingId}
                onChange={(e) => set({ buildingId: e.target.value })}
                className={field}
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
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
            <select
              value={values.size}
              onChange={(e) => set({ size: e.target.value })}
              className={field}
            >
              <option>Large</option>
              <option>Small</option>
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">
              แบรนด์ประจำห้อง (ถ้ามี)
            </span>
            <input
              value={values.brandAssignment}
              onChange={(e) => set({ brandAssignment: e.target.value })}
              placeholder="เช่น Adidas"
              className={`${field} placeholder:text-muted`}
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-conflict-bg px-3 py-2 text-xs text-conflict-fg"
            >
              {error}
            </p>
          )}
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
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg px-4 py-2 text-xs font-medium text-soft hover:text-ink"
          >
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

// Add buildings, rename them or change their short code; a building with
// rooms can't be deleted.
function BuildingsPanel({
  buildings,
  onClose,
}: {
  buildings: Building[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState({ name: "", code: "" });

  async function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const r = await work();
    if (!r.ok) setError(r.error ?? "ทำรายการไม่สำเร็จ");
    return r.ok;
  }

  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">จัดการตึก</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="rounded-md p-1 text-muted hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-2">
        {buildings.map((b) => (
          <BuildingRow key={b.id} building={b} run={run} />
        ))}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => saveBuildingAction(adding)))
              setAdding({ name: "", code: "" });
          }}
          className="flex flex-wrap items-center gap-2 border-t border-line pt-3"
        >
          <input
            value={adding.name}
            onChange={(e) => setAdding({ ...adding, name: e.target.value })}
            placeholder="ชื่อตึกใหม่"
            aria-label="ชื่อตึกใหม่"
            className={`${small} w-56`}
          />
          <input
            value={adding.code}
            onChange={(e) => setAdding({ ...adding, code: e.target.value })}
            placeholder="ตัวย่อ เช่น RS"
            aria-label="ตัวย่อตึกใหม่"
            maxLength={4}
            className={`${small} w-28 uppercase`}
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
          >
            <Plus size={13} /> เพิ่มตึก
          </button>
        </form>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-conflict-bg px-3 py-2 text-xs text-conflict-fg"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

const small =
  "rounded-md border border-line-strong bg-field px-2.5 py-1.5 text-xs text-ink outline-none placeholder:text-muted focus:border-primary";

function BuildingRow({
  building: b,
  run,
}: {
  building: Building;
  run: (
    work: () => Promise<{ ok: boolean; error?: string }>,
  ) => Promise<boolean>;
}) {
  const [name, setName] = useState(b.name);
  const [code, setCode] = useState(b.code);
  const changed = name !== b.name || code !== b.code;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label={`ชื่อตึก ${b.name}`}
        className={`${small} w-56`}
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        aria-label={`ตัวย่อ ${b.name}`}
        maxLength={4}
        className={`${small} w-28 uppercase`}
      />
      <span className="text-[11px] text-muted">{b.roomCount} ห้อง</span>
      {changed && (
        <button
          type="button"
          onClick={() => run(() => saveBuildingAction({ name, code }, b.id))}
          className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-hover"
        >
          <Check size={12} /> บันทึก
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          window.confirm(`ลบตึก ${b.name}?`) &&
          run(() => deleteBuildingAction(b.id))
        }
        aria-label={`ลบตึก ${b.name}`}
        className="rounded-md p-1.5 text-muted hover:bg-conflict-bg hover:text-conflict-fg"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
