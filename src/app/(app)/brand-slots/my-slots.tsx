"use client";

import { Pencil } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SlotListItem } from "@/application/ports";
import { dayLabel, STATUS_META, STATUS_ORDER, timeRange } from "../../format";
import { StatusBadge } from "../status-badge";

interface Props {
  slots: SlotListItem[];
  limit: number;
  brandNames: string[];
  filters: { brand: string | null; status: string | null };
  mine: boolean;
  canEdit: (slot: SlotListItem) => boolean;
  onEdit: (slot: SlotListItem) => void;
}

export function MySlots({ slots, limit, brandNames, filters, mine, canEdit, onEdit }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(key: "brand" | "status", value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{mine ? "สล็อตของฉัน" : "สล็อตทั้งหมด"}</h2>
        <select
          value={filters.brand ?? ""}
          onChange={(e) => setFilter("brand", e.target.value || null)}
          aria-label="กรองตามแบรนด์"
          className="max-w-[150px] rounded-md border border-line-strong bg-field px-2 py-1 text-[11px] text-ink outline-none"
        >
          <option value="">ทุกแบรนด์</option>
          {brandNames.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {[null, ...STATUS_ORDER].map((s) => (
          <button
            key={s ?? "all"}
            type="button"
            onClick={() => setFilter("status", s)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
              filters.status === s || (!filters.status && !s)
                ? "bg-primary/15 text-accent"
                : "text-muted hover:bg-field hover:text-soft"
            }`}
          >
            {s ? STATUS_META[s].label : "ทั้งหมด"}
          </button>
        ))}
      </div>

      {slots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-muted">
          ไม่มีสล็อตตามตัวกรองนี้
        </p>
      ) : (
        <ul className="grid max-h-[480px] gap-1.5 overflow-y-auto pr-1">
          {slots.map((s) => (
            <li key={s.id} className="rounded-lg border border-line bg-field px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {s.brandName} <span className="font-normal text-muted">({s.platform})</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-soft">
                    {dayLabel(s.date)} · {timeRange(s.startMinute, s.endMinute)}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {s.roomName}
                    {!mine && ` · ${s.aeName}`}
                    {s.mcName && ` · MC ${s.mcName}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <StatusBadge status={s.status} />
                  {canEdit(s) && (
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      aria-label="แก้ไขสล็อต"
                      className="rounded-md p-1 text-muted hover:bg-card hover:text-soft"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {slots.length >= limit && (
        <p className="mt-2 text-center text-[10px] text-muted">
          แสดง {limit} รายการแรก — ใช้ตัวกรองเพื่อดูเพิ่ม
        </p>
      )}
    </section>
  );
}
