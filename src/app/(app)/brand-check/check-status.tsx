import type { CheckStatus } from "@/domain/brand-check";

export const CHECK_META: Record<CheckStatus, { label: string; className: string }> = {
  no_plan: { label: "รอ Plan", className: "bg-line text-soft" },
  short: { label: "ยังไม่ครบ", className: "bg-waiting-bg text-waiting-fg" },
  over: { label: "เกิน Plan", className: "bg-conflict-bg text-conflict-fg" },
  awaiting_approval: { label: "รอ Planner Approve", className: "bg-completed-bg text-completed-fg" },
  ready: { label: "พร้อมยืนยัน", className: "bg-primary/15 text-accent" },
  confirmed: { label: "🔒 ยืนยันแล้ว", className: "bg-confirmed-bg text-confirmed-fg" },
};

export function CheckBadge({ status }: { status: CheckStatus }) {
  const m = CHECK_META[status];
  return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold ${m.className}`}>{m.label}</span>;
}

export const hrs = (minutes: number) => (minutes / 60).toFixed(1);
