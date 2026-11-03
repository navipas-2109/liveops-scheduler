"use client";

import { Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { BulkResult } from "@/application/catalog/bulk";

export type BulkOutcome = { ok: true; value: BulkResult } | { ok: false; error: string };

// Which rows are ticked. Rows that disappear (deleted, filtered out of the
// data) drop out of the selection on their own.
export function useSelection(allIds: string[]) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const selected = allIds.filter((id) => picked.has(id));
  return {
    selected,
    has: (id: string) => picked.has(id),
    toggle: (id: string) =>
      setPicked((s) => {
        const next = new Set(s);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    // Tick or untick every row currently shown.
    toggleAll: (shown: string[]) =>
      setPicked((s) => {
        const all = shown.every((id) => s.has(id));
        const next = new Set(s);
        for (const id of shown) {
          if (all) next.delete(id);
          else next.add(id);
        }
        return next;
      }),
    clear: () => setPicked(new Set()),
  };
}

export function SelectAll({ shown, selection }: { shown: string[]; selection: ReturnType<typeof useSelection> }) {
  const ticked = shown.filter((id) => selection.has(id)).length;
  return (
    <input
      type="checkbox"
      aria-label="เลือกทั้งหมดที่แสดง"
      checked={shown.length > 0 && ticked === shown.length}
      ref={(el) => {
        if (el) el.indeterminate = ticked > 0 && ticked < shown.length;
      }}
      onChange={() => selection.toggleAll(shown)}
    />
  );
}

// Sticky bar shown while rows are ticked.
export function BulkBar({
  count,
  onEdit,
  onDelete,
  onClear,
  pending,
}: {
  count: number;
  onEdit: () => void;
  onDelete: () => void;
  onClear: () => void;
  pending: boolean;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-panel px-4 py-2.5 text-xs shadow-xl">
      <span className="font-semibold">เลือก {count} รายการ</span>
      <button
        type="button"
        onClick={onEdit}
        disabled={pending}
        className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
      >
        <Pencil size={13} /> แก้ไขที่เลือก
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-conflict-fg/40 px-3 py-1.5 font-semibold text-conflict-fg hover:bg-conflict-bg disabled:opacity-50"
      >
        <Trash2 size={13} /> ลบที่เลือก
      </button>
      <button type="button" onClick={onClear} className="rounded-lg px-2 py-1.5 text-soft hover:text-ink">
        ยกเลิกการเลือก
      </button>
    </div>
  );
}

// What happened after a bulk action: how many went through, which were skipped.
export function BulkNote({ note, onClose }: { note: { verb: string; outcome: BulkOutcome } | null; onClose: () => void }) {
  if (!note) return null;
  const { verb, outcome } = note;
  const bad = !outcome.ok || outcome.value.skipped.length > 0;
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
        bad ? "border-waiting-fg/30 bg-waiting-bg text-waiting-fg" : "border-confirmed-fg/30 bg-confirmed-bg text-confirmed-fg"
      }`}
    >
      <div className="min-w-0 flex-1">
        {outcome.ok ? (
          <>
            <p className="font-semibold">
              {verb}แล้ว {outcome.value.done} รายการ
              {outcome.value.skipped.length > 0 && ` · ข้าม ${outcome.value.skipped.length} รายการ`}
            </p>
            {outcome.value.skipped.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {outcome.value.skipped.slice(0, 10).map((s) => (
                  <li key={s.name}>
                    {s.name}: {s.reason}
                  </li>
                ))}
                {outcome.value.skipped.length > 10 && <li>และอีก {outcome.value.skipped.length - 10} รายการ</li>}
              </ul>
            )}
          </>
        ) : (
          <p className="font-semibold">{outcome.error}</p>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="ปิด" className="rounded p-0.5 hover:bg-black/10">
        <X size={13} />
      </button>
    </div>
  );
}

// Right-hand form for editing all ticked rows. Only fields switched on change.
export function BulkDrawer({
  title,
  count,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  count: number;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          await onSubmit();
          setPending(false);
        }}
        className="relative flex h-full w-full max-w-[400px] flex-col border-l border-line-strong bg-panel shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">
            {title} <span className="font-normal text-muted">({count} รายการ)</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
          <p className="text-[11px] text-muted">ติ้กเฉพาะช่องที่ต้องการเปลี่ยน ช่องที่ไม่ได้ติ้กจะคงค่าเดิมของแต่ละรายการ</p>
          {children}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-soft hover:text-ink">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "กำลังบันทึก…" : `บันทึก ${count} รายการ`}
          </button>
        </div>
      </form>
    </div>
  );
}

// A form field that only applies when its box is ticked.
export function BulkField({
  label,
  on,
  onToggle,
  children,
}: {
  label: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="flex items-center gap-2 text-[11px] text-soft">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} />
        เปลี่ยน{label}
      </label>
      <fieldset disabled={!on} className={on ? "" : "opacity-40"}>
        {children}
      </fieldset>
    </div>
  );
}
