"use client";

import { FileSpreadsheet, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ImportPreview, MatchKind } from "@/application/shifts/import-shifts";
import { guessMonth, pickShiftSheet, rowsToText, SHIFT_CODES, type CellValue } from "@/domain/shift-sheet";
import { monthLabel } from "../../format";
import { importShiftsAction, previewImportAction } from "./actions";

const MATCH_LABEL: Record<MatchKind, { text: string; className: string }> = {
  id: { text: "ตรงรหัสพนักงาน", className: "bg-confirmed-bg text-confirmed-fg" },
  name: { text: "ตรงชื่อ · จะบันทึกรหัส", className: "bg-completed-bg text-completed-fg" },
  new: { text: "พนักงานใหม่ · จะเพิ่มให้", className: "bg-waiting-bg text-waiting-fg" },
};

type Workbook = { fileName: string; sheets: { name: string; rows: CellValue[][] }[]; selected: string };

// Upload the month's .xlsx (or paste the shift tab), check what will happen,
// then import. The workbook is read in the browser; only the chosen tab's
// cells are sent to the server.
export function ImportDrawer({ defaultMonth, onClose }: { defaultMonth: string; onClose: () => void }) {
  const [month, setMonth] = useState(defaultMonth);
  const [source, setSource] = useState<"file" | "paste">("file");
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function selectSheet(wb: Workbook, name: string) {
    setWorkbook({ ...wb, selected: name });
    setText(rowsToText(wb.sheets.find((x) => x.name === name)?.rows ?? []));
    setPreview(null);
    setDone(null);
  }

  async function readFile(file: File) {
    setError(null);
    setPreview(null);
    setDone(null);
    setWorkbook(null);
    setText("");
    if (!/\.xlsx$/i.test(file.name)) return setError("รองรับเฉพาะไฟล์ .xlsx (Google Sheets: File → Download → Microsoft Excel)");
    setPending(true);
    try {
      const { default: readExcelFile } = await import("read-excel-file/browser");
      const sheets = (await readExcelFile(file)).map((x) => ({ name: x.sheet, rows: x.data as CellValue[][] }));
      const names = sheets.map((x) => x.name);
      const wb = { fileName: file.name, sheets, selected: "" };
      selectSheet(wb, pickShiftSheet(names) ?? names[0]);
      const guessed = guessMonth(file.name);
      if (guessed) setMonth(guessed);
    } catch {
      setError("อ่านไฟล์ไม่ได้ — ตรวจว่าเป็นไฟล์ .xlsx ที่ดาวน์โหลดจาก Google Sheets");
    } finally {
      setPending(false);
    }
  }

  async function check() {
    setPending(true);
    setError(null);
    setPreview(null);
    const r = await previewImportAction(month, text);
    setPending(false);
    if (r.ok) setPreview(r.value);
    else setError(r.error);
  }

  async function confirm() {
    setPending(true);
    setError(null);
    const r = await importShiftsAction(month, text);
    setPending(false);
    if (!r.ok) return setError(r.error);
    setDone(
      `นำเข้าแล้ว ${r.value.entries} รายการ จาก ${r.value.people} คน` +
        (r.value.added ? ` (เพิ่มพนักงานใหม่ ${r.value.added} คน)` : ""),
    );
    setPreview(null);
    setText("");
  }

  const newCount = preview?.people.filter((p) => p.match === "new").length ?? 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative flex h-full w-full max-w-[680px] flex-col border-l border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold">นำเข้ากะจาก Google Sheet</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-md p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-5 text-xs">
          <div role="tablist" className="grid grid-cols-2 rounded-lg bg-field p-1">
            {(
              [
                ["file", "อัปโหลดไฟล์ .xlsx"],
                ["paste", "วางข้อมูล (Copy-Paste)"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={source === id}
                onClick={() => {
                  setSource(id);
                  setText("");
                  setWorkbook(null);
                  setPreview(null);
                  setError(null);
                }}
                className={`rounded-md px-2 py-2 font-medium ${source === id ? "bg-card text-ink shadow" : "text-muted hover:text-soft"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <ol className="grid list-decimal gap-1 rounded-lg bg-field px-5 py-3 text-soft">
            {source === "file" ? (
              <>
                <li>
                  ใน Google Sheet ไปที่ <b>File → Download → Microsoft Excel (.xlsx)</b>
                </li>
                <li>เลือกไฟล์ด้านล่าง — ระบบจะเลือกแท็บ Shift Planning และเดือนจากชื่อไฟล์ให้</li>
                <li>ตรวจแท็บ/เดือน แล้วกด “ตรวจสอบ”</li>
              </>
            ) : (
              <>
                <li>เปิดแท็บ <b>Shift Planning</b> ของเดือนที่ต้องการ</li>
                <li>
                  ลากเลือกตั้งแต่แถว <b>Employee ID · Name · Title · Squad · 1 2 3 …</b> ลงไปถึงพนักงานคนสุดท้าย แล้วกด
                  Ctrl+C (Mac: ⌘+C)
                </li>
                <li>วางในช่องด้านล่าง แล้วกด “ตรวจสอบ”</li>
              </>
            )}
          </ol>

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SHIFT_CODES).map(([code, c]) => (
              <span key={code} className="rounded-md border border-line px-2 py-1 text-[10px] text-soft">
                <b>{code}</b> = {c.label}
                {c.start && ` ${c.start}–${c.end}`}
              </span>
            ))}
            <span className="rounded-md border border-line px-2 py-1 text-[10px] text-muted">ช่องว่าง = ยังไม่ลงกะ (ข้าม)</span>
          </div>

          <label className="grid gap-1.5">
            <span className="text-[11px] text-soft">เดือนของตาราง</span>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPreview(null);
              }}
              className="w-48 rounded-lg border border-line-strong bg-field px-3 py-2 text-ink outline-none focus:border-primary"
            />
          </label>

          {source === "file" ? (
            <div className="grid gap-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong bg-field px-4 py-4 hover:border-primary">
                <FileSpreadsheet size={20} className="shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">
                    {workbook ? workbook.fileName : pending ? "กำลังอ่านไฟล์…" : "เลือกไฟล์ .xlsx"}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {workbook ? `${workbook.sheets.length} แท็บในไฟล์ · คลิกเพื่อเปลี่ยนไฟล์` : "ไฟล์จะถูกอ่านในเครื่องของคุณ ไม่ได้อัปโหลดทั้งไฟล์"}
                  </span>
                </span>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readFile(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {workbook && (
                <label className="grid gap-1.5">
                  <span className="text-[11px] text-soft">แท็บที่มีตารางกะ</span>
                  <select
                    value={workbook.selected}
                    onChange={(e) => selectSheet(workbook, e.target.value)}
                    className="w-full max-w-sm rounded-lg border border-line-strong bg-field px-3 py-2 text-ink outline-none focus:border-primary"
                  >
                    {workbook.sheets.map((x) => (
                      <option key={x.name} value={x.name}>
                        {x.name} ({x.rows.length} แถว)
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ) : (
            <label className="grid gap-1.5">
              <span className="text-[11px] text-soft">วางข้อมูลจาก Google Sheet</span>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setPreview(null);
                  setDone(null);
                }}
                rows={7}
                spellCheck={false}
                placeholder={"Employee ID\tName\tTitle\tSquad\t1\t2\t3 …\n110112\tM\tProducer Team Lead\t\t1\tOF\tOF …"}
                className="w-full resize-y rounded-lg border border-line-strong bg-field px-3 py-2 font-mono text-[11px] text-ink outline-none placeholder:text-muted focus:border-primary"
              />
            </label>
          )}

          {error && <p role="alert" className="rounded-lg bg-conflict-bg px-3 py-2 text-conflict-fg">{error}</p>}
          {done && <p role="status" className="rounded-lg bg-confirmed-bg px-3 py-2 text-confirmed-fg">{done}</p>}

          {preview && (
            <div className="grid gap-3 rounded-lg border border-line p-3">
              <p className="font-semibold">
                {monthLabel(preview.month)}: พบ {preview.people.length} คน · {preview.entries} รายการ
                {preview.blankCells > 0 && <span className="font-normal text-muted"> · ช่องว่าง {preview.blankCells} ช่อง (ข้าม)</span>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(preview.codeCounts).map(([code, n]) => (
                  <span key={code} className="rounded-md bg-field px-2 py-1 text-[11px]">
                    {code} {SHIFT_CODES[code]?.label} · <b>{n}</b>
                  </span>
                ))}
              </div>
              {Object.keys(preview.unknownCodes).length > 0 && (
                <p className="rounded-md bg-waiting-bg px-3 py-2 text-waiting-fg">
                  รหัสที่ระบบไม่รู้จัก (จะข้าม):{" "}
                  {Object.entries(preview.unknownCodes).map(([c, n]) => `${c} × ${n}`).join(", ")} — แจ้งผู้ดูแลระบบให้เพิ่มรหัสได้
                </p>
              )}
              {newCount > 0 && (
                <p className="text-waiting-fg">จะเพิ่มพนักงานใหม่ {newCount} คน — ตรวจชื่อด้านล่างก่อนยืนยัน</p>
              )}
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-panel text-muted">
                    <tr>
                      <th className="py-1.5 pr-2 font-semibold">รหัส</th>
                      <th className="py-1.5 pr-2 font-semibold">ชื่อ</th>
                      <th className="py-1.5 pr-2 font-semibold">ตำแหน่ง / Squad</th>
                      <th className="py-1.5 pr-2 text-right font-semibold">รายการ</th>
                      <th className="py-1.5 font-semibold">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.people.map((p, i) => (
                      <tr key={i} className="border-t border-line/60">
                        <td className="py-1.5 pr-2 tabular-nums text-soft">{p.employeeId ?? "—"}</td>
                        <td className="py-1.5 pr-2 font-medium">
                          {p.name}
                          {p.existingName && p.existingName !== p.name && (
                            <span className="text-muted"> (ในระบบ: {p.existingName})</span>
                          )}
                        </td>
                        <td className="max-w-[200px] truncate py-1.5 pr-2 text-muted">
                          {p.title}
                          {p.squad && ` · ${p.squad}`}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{p.shifts}</td>
                        <td className="py-1.5">
                          <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${MATCH_LABEL[p.match].className}`}>
                            {MATCH_LABEL[p.match].text}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted">
                การยืนยันจะ <b>แทนที่กะทั้งเดือน {monthLabel(preview.month)}</b> ของคนในรายการนี้ · คนที่ไม่อยู่ในรายการจะไม่ถูกแตะ
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-soft hover:text-ink">
            {done ? "ปิด" : "ยกเลิก"}
          </button>
          {preview ? (
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {pending ? "กำลังนำเข้า…" : `ยืนยันนำเข้า ${preview.entries} รายการ`}
            </button>
          ) : (
            <button
              type="button"
              onClick={check}
              disabled={pending || !text.trim()}
              className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {pending ? "กำลังตรวจ…" : "ตรวจสอบ"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
