"use client";

import { useState } from "react";
import type { Producer, ShiftItem, SlotListItem } from "@/application/ports";
import { isStaffReady } from "@/domain/slot-rules";
import { timeRange } from "../../format";
import { StatusBadge } from "../status-badge";
import { assignStaffAction } from "./actions";

interface Props {
  slot: SlotListItem;
  shifts: ShiftItem[];
  producers: Producer[];
  canEdit: boolean;
}

type Field = "producerId" | "admin1Id" | "admin2Id";

const FIELDS: { field: Field; label: string }[] = [
  { field: "producerId", label: "Producer" },
  { field: "admin1Id", label: "Admin 1" },
  { field: "admin2Id", label: "Admin 2" },
];

// One live with Producer / Admin pickers. People whose live shift covers the
// live come first, then others working today, then everyone else.
export function StaffRow({ slot, shifts, producers, canEdit }: Props) {
  const [values, setValues] = useState({
    producerId: slot.producerId ?? "",
    admin1Id: slot.admin1Id ?? "",
    admin2Id: slot.admin2Id ?? "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed =
    values.producerId !== (slot.producerId ?? "") ||
    values.admin1Id !== (slot.admin1Id ?? "") ||
    values.admin2Id !== (slot.admin2Id ?? "");

  const shiftOf = new Map(shifts.map((s) => [s.producerId, s]));
  const covers = (s: ShiftItem | undefined) =>
    !!s && s.kind === "live" && s.shiftStart !== null && s.shiftEnd !== null &&
    s.shiftStart <= slot.startMinute && slot.endMinute <= s.shiftEnd;
  const covering = producers.filter((p) => covers(shiftOf.get(p.id)));
  const workingToday = producers.filter((p) => {
    const s = shiftOf.get(p.id);
    return !covers(s) && (s?.kind === "live" || s?.kind === "office");
  });
  const rest = producers.filter((p) => !covering.includes(p) && !workingToday.includes(p));
  const away = (p: Producer) => {
    const s = shiftOf.get(p.id);
    return s?.kind === "off" ? " (หยุด)" : s?.kind === "leave" ? " (ลา)" : "";
  };

  async function save() {
    setPending(true);
    setError(null);
    const result = await assignStaffAction(slot.id, {
      producerId: values.producerId || null,
      admin1Id: values.admin1Id || null,
      admin2Id: values.admin2Id || null,
    });
    setPending(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <li className="grid gap-2 px-4 py-3 text-xs lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] lg:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {timeRange(slot.startMinute, slot.endMinute)} · {slot.brandName}{" "}
          <span className="font-normal text-muted">({slot.platform})</span>
        </p>
        <p className="truncate text-[11px] text-muted">
          {slot.roomName} · MC {slot.mcName ?? "—"}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {FIELDS.map(({ field, label }) => (
          <label key={field} className="grid gap-1">
            <span className="text-[10px] text-muted">{label}</span>
            <select
              value={values[field]}
              disabled={!canEdit || pending}
              onChange={(e) => setValues({ ...values, [field]: e.target.value })}
              className="w-full rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink outline-none disabled:opacity-70"
            >
              <option value="">—</option>
              {covering.length > 0 && (
                <optgroup label="เข้ากะครอบเวลาไลฟ์">
                  {covering.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {workingToday.length > 0 && (
                <optgroup label="ทำงานวันนี้ (นอกเวลาไลฟ์ / ออฟฟิศ)">
                  {workingToday.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="อื่น ๆ">
                {rest.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {away(p)}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        {error && <span className="text-[11px] text-conflict-fg">{error}</span>}
        {canEdit && changed ? (
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        ) : isStaffReady(slot) ? (
          <span className="rounded bg-confirmed-bg px-2 py-0.5 text-[10px] font-semibold text-confirmed-fg">พร้อม</span>
        ) : (
          <StatusBadge status={slot.status} />
        )}
      </div>
    </li>
  );
}
