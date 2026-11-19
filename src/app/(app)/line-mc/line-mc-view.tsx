"use client";

import { Copy, Search, Send, Unlink } from "lucide-react";
import { useState } from "react";
import type { LineMcPageData } from "@/application/line-queue/admin";
import { dayLabel, shortDateLabel, timeRange } from "../../format";
import { remindMcsAction, resetLineLinkAction } from "./actions";

// Bangkok time, built by hand: Intl output differs between server and browser.
const when = (iso: string) => {
  const t = new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString();
  return `${shortDateLabel(t.slice(0, 10))} ${t.slice(11, 16)}`;
};

// Planner's view of MC confirmations made in LINE, for queues from the sheet.
export function LineMcView({ data, liffUrl }: { data: LineMcPageData; liffUrl: string }) {
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const q = query.trim().toLowerCase();
  const rows = data.rows.filter((r) => !q || r.mcName.toLowerCase().includes(q));
  const linked = data.rows.filter((r) => r.link.lineUserId).length;
  const total = data.rows.reduce((a, r) => a + r.upcoming, 0);
  const confirmed = data.rows.reduce((a, r) => a + r.confirmed, 0);
  const waitingMcs = data.rows.filter((r) => r.link.lineUserId && r.upcoming - r.confirmed - r.declined > 0).length;

  async function remind() {
    if (!window.confirm(`ส่ง LINE เตือน MC ${waitingMcs} คนที่ยังมีคิวรอยืนยัน?\n(1 ข้อความต่อคน — นับในโควตาข้อความของ LINE OA)`)) return;
    setBusy(true);
    const r = await remindMcsAction();
    setBusy(false);
    setNote(r.ok ? { ok: true, text: `ส่งแล้ว ${r.value.sent} คน${r.value.failed ? ` · ส่งไม่สำเร็จ ${r.value.failed}` : ""}` } : { ok: false, text: r.error });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <section className="grid gap-1 rounded-xl border border-line bg-card px-4 py-3 text-xs">
        {data.lastSync ? (
          <p>
            <span className="font-semibold">ดึงคิวจาก Google Sheet ล่าสุด:</span> {when(data.lastSync.syncedAt)} · {data.lastSync.rows} คิว ·
            แท็บ {data.lastSync.sheets}
          </p>
        ) : (
          <p className="text-waiting-fg">ยังไม่เคยดึงคิวจาก Google Sheet — ติดตั้ง Apps Script ในชีตก่อน (ดูวิธีใน docs/line-mc-setup.md)</p>
        )}
        <p className="text-muted">
          หน้า “คิวของฉัน” สำหรับ MC: <span className="select-all text-soft">{liffUrl}</span>
          {!data.lineEnabled && <span className="text-waiting-fg"> · ยังไม่ได้ตั้งค่า LINE (ส่งแจ้งเตือนยังไม่ได้)</span>}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["MC ที่ผูก LINE แล้ว", `${linked}/${data.rows.length}`],
          ["คิวที่กำลังจะมาถึง", total],
          ["ยืนยันแล้ว", `${confirmed}/${total}`],
          ["รับไม่ได้", data.declines.length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-line bg-card px-4 py-3">
            <p className="text-[11px] text-muted">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {note && (
        <p role="status" className={`rounded-lg px-3 py-2 text-xs ${note.ok ? "bg-confirmed-bg text-confirmed-fg" : "bg-conflict-bg text-conflict-fg"}`}>
          {note.text}
        </p>
      )}

      {data.declines.length > 0 && (
        <section className="rounded-xl border border-conflict-fg/30 bg-conflict-bg/30 p-4">
          <h2 className="mb-2 text-sm font-semibold text-conflict-fg">MC แจ้งรับคิวไม่ได้ — ต้องหา MC ใหม่ในชีต</h2>
          <ul className="grid gap-1 text-xs">
            {data.declines.map((d) => (
              <li key={d.key}>
                <span className="font-semibold">{d.mcName}</span> · {dayLabel(d.date)} {timeRange(d.startMinute, d.endMinute)} · {d.brand} ({d.channel})
                {d.reason && <span className="text-muted"> — {d.reason}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <label className="flex items-center gap-2 rounded-lg border border-line-strong bg-field px-2.5 py-1.5 text-muted">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหา MC" className="w-40 bg-transparent text-xs text-ink outline-none placeholder:text-muted" />
          </label>
          {data.canManage && (
            <button
              type="button"
              onClick={remind}
              disabled={busy || !data.lineEnabled || waitingMcs === 0}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={14} /> ส่ง LINE เตือน MC ที่ยังไม่ยืนยัน ({waitingMcs})
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2">MC (ชื่อในชีต)</th>
                <th className="px-3 py-2">รหัสผูก LINE</th>
                <th className="px-3 py-2">LINE</th>
                <th className="px-3 py-2 text-right">คิว</th>
                <th className="px-3 py-2 text-right">ยืนยัน</th>
                <th className="px-3 py-2 text-right">รับไม่ได้</th>
                <th className="px-3 py-2 text-right">รอ</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const waiting = r.upcoming - r.confirmed - r.declined;
                return (
                  <tr key={r.mcName} className="border-b border-line/60">
                    <td className="px-4 py-2 font-semibold">{r.mcName}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(r.link.code)}
                        title="คัดลอกรหัส"
                        className="flex items-center gap-1.5 rounded-md bg-field px-2 py-1 font-mono tracking-widest hover:bg-line"
                      >
                        {r.link.code} <Copy size={11} className="text-muted" />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      {r.link.lineUserId ? (
                        <span className="text-confirmed-fg">✓ ผูกแล้ว{r.link.linkedAt && <span className="text-muted"> · {when(r.link.linkedAt)}</span>}</span>
                      ) : (
                        <span className="text-muted">ยังไม่ผูก</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.upcoming}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-confirmed-fg">{r.confirmed}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-conflict-fg">{r.declined || ""}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${waiting ? "font-semibold text-waiting-fg" : "text-muted"}`}>{waiting}</td>
                    <td className="px-3 py-2">
                      {data.canManage && r.link.lineUserId && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`ยกเลิกการผูก LINE ของ ${r.mcName}? (จะได้รหัสใหม่)`)) return;
                            const res = await resetLineLinkAction(r.mcName);
                            if (!res.ok) setNote({ ok: false, text: res.error });
                          }}
                          aria-label={`ยกเลิกการผูก ${r.mcName}`}
                          className="rounded-md p-1.5 text-muted hover:bg-conflict-bg hover:text-conflict-fg"
                        >
                          <Unlink size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-4 py-8 text-center text-xs text-muted">ยังไม่มี MC — รอดึงคิวจาก Google Sheet</p>}
        </div>
      </section>
    </div>
  );
}
