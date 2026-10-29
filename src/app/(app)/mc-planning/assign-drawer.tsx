"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Mc, SlotListItem } from "@/application/ports";
import type { McBooking } from "@/application/slots/assign-mc";
import { baht, dayLabel, timeRange } from "../../format";
import { StatusBadge } from "../status-badge";
import { assignMcAction, busyMcsAction } from "./actions";

const MC_STATUSES = ["Full-Time", "Exclusive", "Freelance", "Trainee"];

const MC_STATUS_STYLE: Record<string, string> = {
  "Full-Time": "bg-completed-bg text-completed-fg",
  Exclusive: "bg-confirmed-bg text-confirmed-fg",
  Freelance: "bg-waiting-bg text-waiting-fg",
  Trainee: "bg-line text-soft",
};

// Slide-in list of MCs for one slot. MCs already live at that time are
// shown but can't be picked; the server checks again when assigning.
export function AssignDrawer({ slot, mcs, onClose }: { slot: SlotListItem; mcs: Mc[]; onClose: () => void }) {
  const [busy, setBusy] = useState<Record<string, McBooking> | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    busyMcsAction(slot.id).then((b) => !cancelled && setBusy(b));
    return () => {
      cancelled = true;
    };
  }, [slot.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function assign(mcId: string | null) {
    setPendingId(mcId ?? "none");
    setError(null);
    const result = await assignMcAction(slot.id, mcId);
    setPendingId(null);
    if (result.ok) onClose();
    else setError(result.error);
  }

  const q = query.trim().toLowerCase();
  const visible = mcs.filter(
    (m) =>
      (!statusFilter || m.status === statusFilter) &&
      (!q || m.nickname.toLowerCase().includes(q) || m.fullName.toLowerCase().includes(q)),
  );
  // Free MCs first, then busy ones.
  visible.sort((a, b) => Number(!!busy?.[a.id]) - Number(!!busy?.[b.id]));

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative flex h-full w-full max-w-[440px] flex-col border-l border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">Assign MC</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-line px-5 py-4">
          <div className="rounded-lg bg-field px-3 py-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">
                {slot.brandName} <span className="font-normal text-muted">({slot.platform})</span>
              </p>
              <StatusBadge status={slot.status} />
            </div>
            <p className="mt-0.5 text-soft">
              {dayLabel(slot.date)} · {timeRange(slot.startMinute, slot.endMinute)} · {slot.roomName}
            </p>
            {slot.requirement && <p className="mt-0.5 text-muted">Requirement: {slot.requirement}</p>}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
              <span>
                MC ปัจจุบัน: <span className="font-semibold">{slot.mcName ?? "—"}</span>
              </span>
              {slot.mcId && (
                <button
                  type="button"
                  onClick={() => assign(null)}
                  disabled={pendingId !== null}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-conflict-fg hover:bg-conflict-bg"
                >
                  ถอด MC
                </button>
              )}
            </div>
          </div>
          {slot.status === "conflict" && (
            <p className="mt-2 rounded-lg bg-conflict-bg px-3 py-2 text-[11px] text-conflict-fg">
              สล็อตนี้ชนคิว — เปลี่ยน MC หรือแจ้ง AE ให้ย้ายเวลา/ห้อง
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 rounded-lg bg-conflict-bg px-3 py-2 text-xs text-conflict-fg">
              {error}
            </p>
          )}

          <label className="mt-3 flex items-center gap-2 rounded-lg border border-line-strong bg-field px-3 py-2 text-muted">
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อเล่นหรือชื่อจริง"
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted"
              autoFocus
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-1">
            {[null, ...MC_STATUSES].map((s) => (
              <button
                key={s ?? "all"}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  statusFilter === s ? "bg-primary/15 text-accent" : "text-muted hover:bg-field hover:text-soft"
                }`}
              >
                {s ?? "ทั้งหมด"}
              </button>
            ))}
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto px-3 py-2">
          {busy === null && <li className="px-2 py-4 text-center text-xs text-muted">กำลังตรวจคิว MC…</li>}
          {busy !== null &&
            visible.map((mc) => {
              const booking = busy[mc.id];
              const current = mc.id === slot.mcId;
              return (
                <li key={mc.id}>
                  <button
                    type="button"
                    disabled={!!booking || current || pendingId !== null}
                    onClick={() => assign(mc.id)}
                    className={`mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs ${
                      current
                        ? "bg-primary/15"
                        : booking
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-field"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {mc.nickname} {current && <span className="text-accent">· ปัจจุบัน</span>}
                      </span>
                      <span className="block truncate text-[11px] text-muted">{mc.fullName}</span>
                      {booking && (
                        <span className="block text-[11px] text-conflict-fg">
                          ชนคิว: {booking.brandName} {timeRange(booking.startMinute, booking.endMinute)}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${MC_STATUS_STYLE[mc.status]}`}>
                        {mc.status}
                      </span>
                      <span className="mt-1 block text-[10px] text-muted">
                        {pendingId === mc.id
                          ? "กำลังบันทึก…"
                          : `${baht(mc.rate)}/${mc.rateType === "per_slot" ? "slot" : "ชม."}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          {busy !== null && visible.length === 0 && (
            <li className="px-2 py-4 text-center text-xs text-muted">ไม่พบ MC</li>
          )}
        </ul>
      </div>
    </div>
  );
}
