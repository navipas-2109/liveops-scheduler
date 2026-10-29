import { Pencil, UserRoundPlus, X } from "lucide-react";
import Link from "next/link";
import type { SlotListItem } from "@/application/ports";
import type { Role } from "@/domain/roles";
import { isStaffReady } from "@/domain/slot-rules";
import { dayLabel, timeRange } from "../../format";
import { StatusBadge } from "../status-badge";

interface Props {
  slot: SlotListItem;
  roomColor: string;
  role: Role;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
}

// Right-hand panel (bottom sheet on phones) with everything about one slot.
export function SlotDetail({ slot, roomColor, role, canEdit, onEdit, onClose }: Props) {
  const ready = isStaffReady(slot);
  const admins = [slot.admin1Name, slot.admin2Name].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    ["วันที่", dayLabel(slot.date)],
    ["เวลา", timeRange(slot.startMinute, slot.endMinute)],
    ["ห้อง", slot.roomName],
    ["แคมเปญ", slot.campaign || "—"],
    ["Requirement", slot.requirement || "—"],
    ["AE", slot.aeName],
    ["MC", slot.mcName ?? "—"],
    ["Planner", slot.plannerName ?? "—"],
    ["Producer", slot.producerName ?? "—"],
    ["Live Admin", admins || "—"],
  ];
  const canAssign = (role === "PLANNER" || role === "MANAGER") && slot.status !== "completed";
  const [y, m] = slot.date.split("-");

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 max-h-[75vh] overflow-y-auto rounded-t-2xl border border-line-strong bg-panel p-4 shadow-2xl xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-96px)] xl:rounded-xl xl:border-line xl:bg-card xl:shadow-none">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 border-l-[3px] pl-2.5" style={{ borderLeftColor: roomColor }}>
          <p className="truncate text-sm font-semibold">{slot.brandName}</p>
          <p className="text-[11px] text-muted">{slot.platform}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={slot.status} />
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
            ready ? "bg-confirmed-bg text-confirmed-fg" : "bg-waiting-bg text-waiting-fg"
          }`}
        >
          ทีมงาน{ready ? "พร้อม" : "ไม่พร้อม"}
        </span>
      </div>
      <dl className="grid gap-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-line/60 pb-1.5">
            <dt className="shrink-0 text-muted">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-2">
        {canAssign && (
          <Link
            href={`/mc-planning?month=${y}-${m}&day=${slot.date}&status=all`}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
          >
            <UserRoundPlus size={14} /> {slot.mcName ? "เปลี่ยน MC" : "ลง MC"}
          </Link>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs font-medium text-soft hover:bg-field hover:text-ink"
          >
            <Pencil size={13} /> แก้ไขสล็อต
          </button>
        )}
      </div>
    </aside>
  );
}
