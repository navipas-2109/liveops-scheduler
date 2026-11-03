"use client";

import { Check, ChevronLeft, ChevronRight, ClipboardCopy, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { SlotListItem } from "@/application/ports";
import type { McSheetPageData } from "@/application/slots/get-mc-sheet-page";
import { monthLabel, shiftMonth } from "../../format";
import { AssignDrawer } from "../mc-planning/assign-drawer";
import { hours, pdNames, sheetDate, sheetTime, toCsv, toTsv } from "./sheet-export";

const select =
  "rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink outline-none max-w-[200px]";

const ROW_TONE: Record<string, string> = {
  waiting: "border-l-waiting-fg",
  conflict: "border-l-conflict-fg bg-conflict-bg/40",
  confirmed: "border-l-confirmed-fg",
  completed: "border-l-completed-fg",
};

// The confirmed lives of the month as one sheet, brand by brand, ready for
// the Planner to put an MC on each.
export function McSheetView({ data }: { data: McSheetPageData }) {
  const [brand, setBrand] = useState("");
  const [channel, setChannel] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [selected, setSelected] = useState<SlotListItem | null>(null);
  const [copied, setCopied] = useState(false);

  const brands = [...new Set(data.rows.map((r) => r.brandName))];
  const channels = [...new Set(data.rows.map((r) => r.platform))].sort();
  const rows = data.rows.filter(
    (r) => (!brand || r.brandName === brand) && (!channel || r.platform === channel) && (!missingOnly || !r.mcId),
  );
  const missing = data.rows.filter((r) => !r.mcId).length;
  const pendingLives = data.pending.reduce((a, p) => a + p.total, 0);

  async function copy() {
    await navigator.clipboard.writeText(toTsv(rows));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mc-slots-${data.month}${brand ? `-${brand}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="flex flex-wrap items-center gap-2">
          <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="แบรนด์" className={select}>
            <option value="">ทุกแบรนด์</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Channel" className={select}>
            <option value="">ทุก Channel</option>
            {channels.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-soft">
            <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
            เฉพาะที่ยังไม่มี MC ({missing})
          </label>
          <button
            type="button"
            onClick={copy}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-soft hover:bg-field disabled:opacity-50"
          >
            {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
            {copied ? "คัดลอกแล้ว" : "คัดลอกไป Google Sheet"}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            <Download size={14} /> ดาวน์โหลด CSV
          </button>
        </div>
      </section>

      {data.pending.length > 0 && (
        <details className="rounded-xl border border-waiting-fg/30 bg-waiting-bg/40 px-4 py-2.5 text-xs text-waiting-fg">
          <summary className="cursor-pointer">
            รอ AE ยืนยัน {data.pending.length} แบรนด์ ({pendingLives} ไลฟ์) — จะขึ้นในชีตนี้หลังกด “ยืนยัน & ล็อก” ที่หน้า Input Live Slot
          </summary>
          <p className="mt-2 text-soft">
            {data.pending.map((p) => `${p.brandName} (${p.platform}) ${p.total}`).join(" · ")}
          </p>
        </details>
      )}

      <section className="rounded-xl border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="bg-primary text-[11px] text-white">
              <tr>
                {["MC", "Brand", "Channel", "Date", "Start Time", "End Time", "Hrs", "Room", "PD", "Note"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={`border-b border-l-[3px] border-b-line/60 ${ROW_TONE[s.status] ?? ""}`}>
                  <td className="px-2 py-1">
                    {data.canAssign && s.status !== "completed" ? (
                      <button
                        type="button"
                        onClick={() => setSelected(s)}
                        className={`w-28 truncate rounded-md px-2 py-1 text-left ${
                          s.mcName ? "bg-field font-semibold text-ink" : "border border-dashed border-line-strong text-muted"
                        } hover:border-primary`}
                      >
                        {s.mcName ?? "เลือก MC ▾"}
                      </button>
                    ) : (
                      <span className="px-2 font-semibold">{s.mcName ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 font-medium">{s.brandName}</td>
                  <td className="px-3 py-1.5">{s.platform}</td>
                  <td className="px-3 py-1.5 tabular-nums">{sheetDate(s.date)}</td>
                  <td className="px-3 py-1.5 tabular-nums">{sheetTime(s.startMinute)}</td>
                  <td className="px-3 py-1.5 tabular-nums">{sheetTime(s.endMinute)}</td>
                  <td className="px-3 py-1.5 tabular-nums">{hours(s)}</td>
                  <td className="px-3 py-1.5 text-soft">{s.roomName}</td>
                  <td className="px-3 py-1.5 text-soft">{pdNames(s) || "—"}</td>
                  <td className="max-w-[240px] truncate px-3 py-1.5 text-muted" title={s.requirement}>
                    {s.status === "conflict" && <span className="mr-1 font-semibold text-conflict-fg">คิวชน</span>}
                    {s.requirement}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="px-4 py-10 text-center text-xs text-muted">
              {data.rows.length === 0 ? "ยังไม่มีแบรนด์ที่ยืนยันสล็อตเดือนนี้" : "ไม่มีสล็อตตรงกับตัวกรอง"}
            </p>
          )}
        </div>
        <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
          {rows.length} สล็อต · {rows.reduce((a, s) => a + hours(s), 0)} ชั่วโมง · คลิกช่อง MC เพื่อเลือก MC (MC ที่ติดไลฟ์อื่นเวลาเดียวกันจะเลือกไม่ได้)
        </p>
      </section>

      {selected && <AssignDrawer slot={selected} mcs={data.mcs} onClose={() => setSelected(null)} />}
    </div>
  );
}
