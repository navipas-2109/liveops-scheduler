"use client";

import { Download, FileSpreadsheet, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProducerAction, ProducerImportPreview } from "@/application/shifts/import-producers";
import { importProducersAction, previewProducerImportAction } from "./actions";

export const TEMPLATE_HREF = "/templates/producer-import-template.xlsx";

const ACTION_META: Record<ProducerAction, { text: string; className: string }> = {
  new: { text: "เพิ่มใหม่", className: "bg-waiting-bg text-waiting-fg" },
  update: { text: "อัปเดต", className: "bg-completed-bg text-completed-fg" },
  same: { text: "ไม่เปลี่ยน", className: "bg-line text-soft" },
  error: { text: "ข้าม", className: "bg-conflict-bg text-conflict-fg" },
};

type Sheet = { name: string; rows: string[][] };
const asText = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""));

// Upload the Producer list (.xlsx), see what will be added or changed, then
// import. The file is read in the browser; only the chosen tab's cells are sent.
export function ProducerImportDrawer({ onClose }: { onClose: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<ProducerImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = sheets.find((s) => s.name === selected)?.rows ?? [];

  async function readFile(file: File) {
    setError(null);
    setPreview(null);
    setDone(null);
    setSheets([]);
    if (!/\.xlsx$/i.test(file.name)) return setError("รองรับเฉพาะไฟล์ .xlsx (Google Sheets: File → Download → Microsoft Excel)");
    setPending(true);
    try {
      const { default: readExcelFile } = await import("read-excel-file/browser");
      const read = (await readExcelFile(file)).map((x) => ({ name: x.sheet, rows: x.data.map((r) => r.map(asText)) }));
      setFileName(file.name);
      setSheets(read);
      const first = read.find((s) => /producer/i.test(s.name)) ?? read[0];
      setSelected(first?.name ?? "");
      if (first) await check(first.rows);
    } catch {
      setError("อ่านไฟล์ไม่ได้ — ตรวจว่าเป็นไฟล์ .xlsx");
    } finally {
      setPending(false);
    }
  }

  async function check(cells = rows) {
    setPending(true);
    setError(null);
    setPreview(null);
    const r = await previewProducerImportAction(cells);
    setPending(false);
    if (r.ok) setPreview(r.value);
    else setError(r.error);
  }

  async function confirm() {
    setPending(true);
    setError(null);
    const r = await importProducersAction(rows);
    setPending(false);
    if (!r.ok) return setError(r.error);
    const { added, updated, skipped } = r.value;
    setDone(
      `นำเข้าแล้ว · เพิ่มใหม่ ${added} คน · อัปเดต ${updated} คน` +
        (skipped.length ? ` · ข้าม ${skipped.length} แถว: ${skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}` : ""),
    );
    setPreview(null);
  }

  const changing = preview ? preview.counts.new + preview.counts.update : 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative flex h-full w-full max-w-[640px] flex-col border-l border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">นำเข้ารายชื่อ Producer จาก xlsx</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-field px-3 py-2.5 text-xs text-soft">
            <span>ยังไม่มีไฟล์? ดาวน์โหลด Template แล้วกรอกรายชื่อในแท็บ Producers</span>
            <a href={TEMPLATE_HREF} download className="flex items-center gap-1.5 font-semibold text-accent hover:underline">
              <Download size={13} /> ดาวน์โหลด Template
            </a>
          </div>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-xs text-soft hover:border-primary">
            <FileSpreadsheet size={22} className="text-accent" />
            <span className="font-semibold text-ink">{fileName ?? "เลือกไฟล์ .xlsx"}</span>
            <span className="text-muted">ระบบจับคู่คนเดิมด้วยรหัสพนักงานก่อน แล้วจึงใช้ชื่อ · คนที่ไม่มีในไฟล์จะไม่ถูกลบ</span>
            <input
              type="file"
              accept=".xlsx"
              aria-label="ไฟล์รายชื่อ Producer"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
            />
          </label>

          {sheets.length > 1 && (
            <label className="flex items-center gap-2 text-xs text-soft">
              แท็บ
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  check(sheets.find((s) => s.name === e.target.value)?.rows ?? []);
                }}
                className="rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink"
              >
                {sheets.map((s) => (
                  <option key={s.name}>{s.name}</option>
                ))}
              </select>
            </label>
          )}

          {pending && <p className="text-xs text-muted">กำลังอ่าน…</p>}
          {error && <p role="alert" className="rounded-lg bg-conflict-bg px-3 py-2 text-xs text-conflict-fg">{error}</p>}
          {done && <p role="status" className="rounded-lg bg-confirmed-bg px-3 py-2 text-xs text-confirmed-fg">{done}</p>}

          {preview && (
            <div className="grid gap-2">
              <p className="text-xs">
                <span className="font-semibold">ตรวจแล้ว {preview.items.length} แถว</span> · เพิ่มใหม่ {preview.counts.new} · อัปเดต{" "}
                {preview.counts.update} · ไม่เปลี่ยน {preview.counts.same}
                {preview.counts.error > 0 && <span className="text-conflict-fg"> · ข้าม {preview.counts.error}</span>}
              </p>
              <div className="max-h-[50vh] overflow-auto rounded-lg border border-line">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-card text-[10px] text-muted">
                    <tr>
                      <th className="px-2 py-1.5">แถว</th>
                      <th className="px-2 py-1.5">ชื่อ</th>
                      <th className="px-2 py-1.5">รหัส</th>
                      <th className="px-2 py-1.5">ผล</th>
                      <th className="px-2 py-1.5">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((i) => (
                      <tr key={i.row} className="border-t border-line/60 align-top">
                        <td className="px-2 py-1.5 tabular-nums text-muted">{i.row}</td>
                        <td className="px-2 py-1.5 font-semibold">{i.name}</td>
                        <td className="px-2 py-1.5 tabular-nums">{i.employeeId ?? "—"}</td>
                        <td className="px-2 py-1.5">
                          <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${ACTION_META[i.action].className}`}>
                            {ACTION_META[i.action].text}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-soft">
                          {i.error ?? (i.action === "new" ? `${i.position}${i.squad ? ` · ${i.squad}` : ""}` : i.changes.join(" · ") || "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-soft hover:text-ink">
            ปิด
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending || !preview || changing === 0}
            className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            นำเข้า {changing} คน
          </button>
        </div>
      </div>
    </div>
  );
}
