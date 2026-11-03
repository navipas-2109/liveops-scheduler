"use client";

import { Check, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { BrandCheckPageData, BrandCheckRow } from "@/application/brand-check/brand-check";
import { TIME_BANDS, type CheckStatus } from "@/domain/brand-check";
import { monthLabel, shiftMonth } from "../../format";
import { setBrandLockAction } from "../input-slots/actions";
import { approvePlanAction, confirmReadyAction, setPlanAction } from "./actions";
import { CHECK_META, CheckBadge, hrs } from "./check-status";

const ROW_TONE: Partial<Record<CheckStatus, string>> = {
  over: "bg-conflict-bg/30",
  short: "bg-waiting-bg/20",
};

// Per brand: hours booked against the Planner's plan. Planner types the plan
// and approves; the AE confirms all ready brands with one button.
export function BrandCheckView({ data }: { data: BrandCheckPageData }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CheckStatus | null>(null);
  const [hideEmpty, setHideEmpty] = useState(!data.canPlan);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const q = query.trim().toLowerCase();
  const shown = data.rows.filter(
    (r) =>
      (!q || `${r.brandName} ${r.platform} ${r.aeNames.join(" ")}`.toLowerCase().includes(q)) &&
      (!status || r.status === status) &&
      (!hideEmpty || r.planMinutes !== null || r.slotCount > 0),
  );
  const ready = data.rows.filter((r) => r.status === "ready");
  const count = (s: CheckStatus) => data.rows.filter((r) => r.status === s).length;
  const sum = (f: (r: BrandCheckRow) => number) => shown.reduce((a, r) => a + f(r), 0);

  async function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    setError(null);
    const r = await work();
    setPending(false);
    if (!r.ok) setError(r.error ?? "ทำรายการไม่สำเร็จ");
  }

  async function confirmAll() {
    const names = ready.map((r) => `${r.brandName} (${r.platform})`).join("\n");
    if (!window.confirm(`ยืนยันและล็อกสล็อต ${ready.length} แบรนด์ เดือน ${monthLabel(data.month)}?\n\n${names}\n\nหลังยืนยัน แก้ไขได้เฉพาะ Planner`)) return;
    await run(() => confirmReadyAction(data.month));
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href={`?month=${shiftMonth(data.month, -1)}`} aria-label="เดือนก่อน" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
            <ChevronLeft size={14} />
          </Link>
          <Link href={`?month=${shiftMonth(data.month, 1)}`} aria-label="เดือนถัดไป" className="rounded-md border border-line-strong p-1.5 text-soft hover:bg-field">
            <ChevronRight size={14} />
          </Link>
          <span className="text-sm font-semibold">{monthLabel(data.month)}</span>
        </div>
        {data.canConfirm && (
          <button
            type="button"
            onClick={confirmAll}
            disabled={pending || ready.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={14} /> ยืนยันสล็อตทั้งหมดที่พร้อม ({ready.length})
          </button>
        )}
      </section>

      <p className="text-[11px] text-muted">
        ขั้นตอน: Planner ใส่ Plan → AE ลงสล็อตจนครบตาม Plan (Balance = 0) → Planner กด Approve → AE กดยืนยันทีเดียว ·
        ถ้าแก้สล็อตหลัง Approve ต้องให้ Planner Approve ใหม่
      </p>

      {error && (
        <p role="alert" className="rounded-lg border border-conflict-fg/30 bg-conflict-bg px-3 py-2 text-xs text-conflict-fg">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <label className="flex items-center gap-2 rounded-lg border border-line-strong bg-field px-2.5 py-1.5 text-muted">
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาแบรนด์ / AE"
              className="w-40 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
            />
          </label>
          {[null, ...(Object.keys(CHECK_META) as CheckStatus[])].map((s) => (
            <button
              key={s ?? "all"}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                status === s ? "bg-primary/15 text-accent" : "text-muted hover:bg-field hover:text-soft"
              }`}
            >
              {s ? CHECK_META[s].label : "ทั้งหมด"} ({s ? count(s) : data.rows.length})
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-[11px] text-soft">
            <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
            ซ่อนแบรนด์ที่ยังไม่มี Plan และสล็อต
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="bg-primary text-[11px] text-white">
              <tr>
                <th className="px-3 py-2 font-semibold">Brand</th>
                <th className="px-3 py-2 font-semibold">Channel</th>
                <th className="px-3 py-2 font-semibold">AE</th>
                <th className="px-3 py-2 text-right font-semibold">Plan (ชม.)</th>
                <th className="px-3 py-2 text-right font-semibold">Total Input</th>
                <th className="px-3 py-2 text-right font-semibold">Balance</th>
                {TIME_BANDS.map((b) => (
                  <th key={b.label} className="px-2 py-2 text-right text-[10px] font-semibold">
                    {b.label}
                  </th>
                ))}
                <th className="px-3 py-2 font-semibold">สถานะ</th>
                <th className="px-3 py-2 font-semibold">Planner Approve</th>
                <th className="px-3 py-2 font-semibold">Remark</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <Row key={`${data.month}:${r.brandId}`} row={r} month={data.month} canPlan={data.canPlan} pending={pending} run={run} />
              ))}
            </tbody>
            {shown.length > 0 && (
              <tfoot className="border-t border-line-strong font-semibold">
                <tr>
                  <td className="px-3 py-2" colSpan={3}>
                    รวม {shown.length} แบรนด์
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{hrs(sum((r) => r.planMinutes ?? 0))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{hrs(sum((r) => r.inputMinutes))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {hrs(sum((r) => (r.planMinutes === null ? 0 : r.inputMinutes - r.planMinutes)))}
                  </td>
                  {TIME_BANDS.map((b, i) => (
                    <td key={b.label} className="px-2 py-2 text-right tabular-nums">
                      {hrs(sum((r) => r.bands[i]))}
                    </td>
                  ))}
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
          {shown.length === 0 && <p className="px-4 py-10 text-center text-xs text-muted">ไม่มีแบรนด์ตรงกับตัวกรอง</p>}
        </div>
      </section>
    </div>
  );
}

function Row({
  row: r,
  month,
  canPlan,
  pending,
  run,
}: {
  row: BrandCheckRow;
  month: string;
  canPlan: boolean;
  pending: boolean;
  run: (work: () => Promise<{ ok: boolean; error?: string }>) => Promise<void>;
}) {
  const [plan, setPlan] = useState(r.planMinutes === null ? "" : String(r.planMinutes / 60));
  const [remark, setRemark] = useState(r.remark);
  const balance = r.planMinutes === null ? null : r.inputMinutes - r.planMinutes;
  const locked = r.status === "confirmed";
  const savePlan = () => {
    const hours = plan.trim() === "" ? null : Number(plan);
    if (hours === null || (hours * 60 === r.planMinutes && remark === r.remark)) return;
    return run(() => setPlanAction(r.brandId, month, hours, remark));
  };
  const input = "w-20 rounded-md border border-line-strong bg-field px-2 py-1 text-right text-xs tabular-nums text-ink outline-none focus:border-primary";

  return (
    <tr className={`border-b border-line/60 ${ROW_TONE[r.status] ?? ""}`}>
      <td className="px-3 py-1.5 font-semibold">{r.brandName}</td>
      <td className="px-3 py-1.5">{r.platform}</td>
      <td className="max-w-[140px] truncate px-3 py-1.5 text-soft">{r.aeNames.join(", ") || "—"}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {canPlan && !locked ? (
          <input
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            onBlur={savePlan}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            inputMode="decimal"
            placeholder="—"
            aria-label={`Plan ${r.brandName} ${r.platform}`}
            className={input}
          />
        ) : r.planMinutes === null ? (
          <span className="text-muted">—</span>
        ) : (
          hrs(r.planMinutes)
        )}
      </td>
      <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{hrs(r.inputMinutes)}</td>
      <td
        className={`px-3 py-1.5 text-right font-semibold tabular-nums ${
          balance === null ? "text-muted" : balance < 0 ? "text-waiting-fg" : balance > 0 ? "text-conflict-fg" : "text-confirmed-fg"
        }`}
      >
        {balance === null ? "—" : `${balance > 0 ? "+" : ""}${hrs(balance)}`}
      </td>
      {r.bands.map((m, i) => (
        <td key={i} className={`px-2 py-1.5 text-right tabular-nums ${m ? "" : "text-muted"}`}>
          {hrs(m)}
        </td>
      ))}
      <td className="px-3 py-1.5">
        <span className="flex items-center gap-1.5">
          <CheckBadge status={r.status} />
          {locked && canPlan && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                window.confirm(`ปลดล็อก ${r.brandName} (${r.platform}) เพื่อแก้ไข?\nแก้เสร็จแล้วให้ AE กดยืนยันใหม่`) &&
                run(() => setBrandLockAction(r.brandId, month, false))
              }
              className="whitespace-nowrap text-[10px] text-muted underline hover:text-ink"
            >
              ปลดล็อก
            </button>
          )}
        </span>
      </td>
      <td className="px-3 py-1.5">
        {r.approvedByName ? (
          <span className="flex items-center gap-1.5 text-confirmed-fg">
            ✓ {r.approvedByName}
            {canPlan && !locked && (
              <button type="button" disabled={pending} onClick={() => run(() => approvePlanAction(r.brandId, month, false))} className="text-[10px] text-muted underline hover:text-ink">
                ยกเลิก
              </button>
            )}
          </span>
        ) : canPlan && r.status === "awaiting_approval" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => approvePlanAction(r.brandId, month, true))}
            className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            Approve
          </button>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-1.5">
        {canPlan && !locked ? (
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            onBlur={() => r.planMinutes !== null && remark !== r.remark && run(() => setPlanAction(r.brandId, month, r.planMinutes! / 60, remark))}
            maxLength={200}
            placeholder={r.planMinutes === null ? "ใส่ Plan ก่อน" : "หมายเหตุ"}
            disabled={r.planMinutes === null}
            className="w-40 rounded-md border border-line-strong bg-field px-2 py-1 text-xs text-ink outline-none placeholder:text-muted focus:border-primary disabled:opacity-50"
          />
        ) : (
          <span className="text-muted">{r.remark || "—"}</span>
        )}
      </td>
    </tr>
  );
}
