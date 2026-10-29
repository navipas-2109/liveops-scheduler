import type { SlotStatus } from "@/domain/slot-rules";
import { STATUS_META } from "../format";

export function StatusBadge({ status, count }: { status: SlotStatus; count?: number }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
      {count !== undefined && <span className="opacity-80">{count}</span>}
    </span>
  );
}
