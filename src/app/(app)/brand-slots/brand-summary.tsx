import type { BrandStatusCounts } from "@/application/ports";
import { STATUS_ORDER } from "../../format";
import { StatusBadge } from "../status-badge";

export function BrandSummary({ summary, mine }: { summary: BrandStatusCounts[]; mine: boolean }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <h2 className="text-sm font-semibold">สรุปตามแบรนด์</h2>
      <p className="mb-3 text-[11px] text-muted">
        {mine ? "สล็อตของคุณในเดือนนี้" : "สล็อตทั้งหมดในเดือนนี้"}
      </p>
      {summary.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line py-4 text-center text-xs text-muted">
          ยังไม่มีสล็อตในเดือนนี้
        </p>
      ) : (
        <ul className="grid max-h-[260px] gap-1.5 overflow-y-auto pr-1">
          {summary.map((b) => {
            const total = Object.values(b.counts).reduce((a, c) => a + (c ?? 0), 0);
            return (
              <li
                key={`${b.brandName}-${b.platform}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-field px-3 py-2"
              >
                <span className="text-xs font-semibold">
                  {b.brandName} <span className="font-normal text-muted">({b.platform})</span>
                  <span className="ml-1.5 text-muted">· {total}</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {STATUS_ORDER.filter((s) => b.counts[s]).map((s) => (
                    <StatusBadge key={s} status={s} count={b.counts[s]} />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
