"use client";

import { Pencil, Search, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Producer } from "@/application/ports";
import { deleteProducerAction, saveProducerAction } from "./actions";

const POSITIONS = ["Producer Team Lead", "Senior Producer", "Producer", "Jr. Producer"];

const POSITION_STYLE: Record<string, string> = {
  "Producer Team Lead": "bg-completed-bg text-completed-fg",
  "Senior Producer": "bg-confirmed-bg text-confirmed-fg",
  Producer: "bg-waiting-bg text-waiting-fg",
  "Jr. Producer": "bg-line text-soft",
};

type Draft = { id?: string; name: string; employeeId: string; position: string; squad: string };

export function ProducersView({ producers, canEdit }: { producers: Producer[]; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const q = query.trim().toLowerCase();
  const visible = producers.filter(
    (p) =>
      (!position || p.position === position) &&
      (!q ||
        p.name.toLowerCase().includes(q) ||
        (p.employeeId ?? "").includes(q) ||
        p.squad.toLowerCase().includes(q)),
  );
  const missingId = producers.filter((p) => !p.employeeId).length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-line-strong bg-field px-2.5 py-1.5 text-muted">
              <Search size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ รหัส หรือ Squad"
                className="w-48 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {[null, ...POSITIONS].map((p) => (
                <button
                  key={p ?? "all"}
                  type="button"
                  onClick={() => setPosition(p)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                    position === p ? "bg-primary/15 text-accent" : "text-muted hover:bg-field hover:text-soft"
                  }`}
                >
                  {p ?? "ทั้งหมด"} ({p ? producers.filter((x) => x.position === p).length : producers.length})
                </button>
              ))}
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setDraft({ name: "", employeeId: "", position: "Jr. Producer", squad: "" })}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
            >
              <UserPlus size={14} /> เพิ่มพนักงาน
            </button>
          )}
        </div>

        {missingId > 0 && (
          <p className="border-b border-line bg-waiting-bg/40 px-4 py-2 text-[11px] text-waiting-fg">
            มี {missingId} คนที่ยังไม่มีรหัสพนักงาน — การนำเข้ากะครั้งแรกจะเติมรหัสให้อัตโนมัติจากชื่อ หรือกด ✎ เพื่อใส่เอง
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-semibold">รหัสพนักงาน</th>
                <th className="px-3 py-2 font-semibold">ชื่อ</th>
                <th className="px-3 py-2 font-semibold">ตำแหน่ง</th>
                <th className="px-3 py-2 font-semibold">Squad</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className="border-b border-line/60 hover:bg-field/50">
                  <td className="px-4 py-2 tabular-nums text-soft">{p.employeeId ?? <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2 font-semibold">{p.name}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${POSITION_STYLE[p.position]}`}>
                      {p.position}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-muted">{p.squad || "—"}</td>
                  <td className="px-3 py-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({ id: p.id, name: p.name, employeeId: p.employeeId ?? "", position: p.position, squad: p.squad })
                        }
                        aria-label={`แก้ไข ${p.name}`}
                        className="rounded-md p-1.5 text-muted hover:bg-field hover:text-ink"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="px-4 py-8 text-center text-xs text-muted">ไม่พบพนักงาน</p>}
        </div>
      </section>

      {draft && <ProducerDrawer key={draft.id ?? "new"} initial={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}

function ProducerDrawer({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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
    const { id, ...input } = values;
    const r = await saveProducerAction(input, id);
    setPending(false);
    if (r.ok) onClose();
    else setError(r.error);
  }

  async function remove() {
    if (!initial.id || !window.confirm(`ลบ ${initial.name} ออกจากระบบ? (กะทั้งหมดของคนนี้จะถูกลบด้วย)`)) return;
    setPending(true);
    setError(null);
    const r = await deleteProducerAction(initial.id);
    setPending(false);
    if (r.ok) onClose();
    else setError(r.error);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <form onSubmit={save} className="relative flex h-full w-full max-w-[400px] flex-col border-l border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">{initial.id ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">รหัสพนักงาน (Employee ID)</span>
            <input
              value={values.employeeId}
              onChange={(e) => setValues({ ...values, employeeId: e.target.value })}
              placeholder="เช่น 110568"
              inputMode="numeric"
              className={`${field} tabular-nums`}
            />
            <span className="text-[10px] text-muted">ใช้จับคู่กับตารางกะใน Google Sheet</span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">ชื่อ (ชื่อเล่นที่ใช้ในทีม)</span>
            <input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required className={field} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">ตำแหน่ง</span>
            <select value={values.position} onChange={(e) => setValues({ ...values, position: e.target.value })} className={field}>
              {POSITIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">Squad (แบรนด์ที่ดูแล)</span>
            <input
              value={values.squad}
              onChange={(e) => setValues({ ...values, squad: e.target.value })}
              placeholder="เช่น Adidas Ch1 (TikTok)"
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
              <Trash2 size={14} /> ลบพนักงาน
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
