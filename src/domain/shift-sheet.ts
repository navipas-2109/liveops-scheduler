// Reads the team's monthly shift sheet (pasted from Google Sheets) into one
// entry per person per day.
//
// Expected layout: a header row with "Employee ID", "Name", "Title", "Squad"
// and then the day numbers 1..31; one row per person below it. Each day cell
// holds a shift code. Blank cells mean the shift hasn't been entered yet and
// are skipped.

import { toLiveMinutes } from "./time";

export type ShiftKind = "live" | "office" | "off" | "leave";

export interface ShiftCode {
  kind: ShiftKind;
  label: string;
  start: string | null; // "HH:MM"
  end: string | null;
}

export const SHIFT_CODES: Record<string, ShiftCode> = {
  "1": { kind: "off", label: "วันหยุด", start: null, end: null },
  "2": { kind: "live", label: "กะเช้า", start: "07:30", end: "16:30" },
  "4": { kind: "live", label: "กะกลาง", start: "11:30", end: "20:30" },
  "3": { kind: "live", label: "กะเย็น", start: "16:30", end: "00:30" },
  OF: { kind: "office", label: "เวลางานออฟฟิศ", start: "09:00", end: "18:00" },
  VL: { kind: "leave", label: "ลาพักร้อน", start: null, end: null },
};

export interface SheetPerson {
  employeeId: string | null;
  name: string;
  title: string;
  squad: string;
}

export interface SheetEntry {
  person: number; // index into people
  date: string;
  kind: ShiftKind;
  code: string;
  shiftStart: number | null;
  shiftEnd: number | null;
}

export interface SheetResult {
  people: SheetPerson[];
  entries: SheetEntry[];
  unknownCodes: Record<string, number>; // code → how many cells
  blankCells: number;
}

export type SheetParse = { ok: true; result: SheetResult } | { ok: false; error: string };

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const key = (s: string) => norm(s).toLowerCase();

export function parseShiftSheet(text: string, month: string): SheetParse {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const rows = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.split("\t").map(norm));

  const headerIndex = rows.findIndex((r) => r.some((c) => key(c) === "name"));
  if (headerIndex < 0) {
    return {
      ok: false,
      error: "ไม่พบแถวหัวตาราง — กรุณาคัดลอกแถวที่มี Employee ID, Name, Title, Squad และเลขวันที่มาด้วย",
    };
  }
  const header = rows[headerIndex];
  const col = (name: string) => header.findIndex((c) => key(c) === name);
  const nameCol = col("name");
  const idCol = col("employee id");
  const titleCol = col("title");
  const squadCol = col("squad");

  // Day columns: header cells holding 1..31 to the right of the name column.
  const dayCols: { index: number; day: number }[] = [];
  header.forEach((c, i) => {
    if (i <= nameCol || !/^\d{1,2}$/.test(c)) return;
    const day = Number(c);
    if (day >= 1 && day <= daysInMonth) dayCols.push({ index: i, day });
  });
  if (dayCols.length === 0) {
    return { ok: false, error: "ไม่พบคอลัมน์วันที่ (1, 2, 3, …) ในแถวหัวตาราง" };
  }

  const result: SheetResult = { people: [], entries: [], unknownCodes: {}, blankCells: 0 };
  for (const row of rows.slice(headerIndex + 1)) {
    const name = row[nameCol] ?? "";
    if (!name) continue;
    const person = result.people.length;
    result.people.push({
      employeeId: idCol >= 0 && row[idCol] ? row[idCol] : null,
      name,
      title: titleCol >= 0 ? (row[titleCol] ?? "") : "",
      squad: squadCol >= 0 ? (row[squadCol] ?? "") : "",
    });
    for (const { index, day } of dayCols) {
      const raw = (row[index] ?? "").toUpperCase();
      if (!raw) {
        result.blankCells++;
        continue;
      }
      const code = SHIFT_CODES[raw];
      if (!code) {
        result.unknownCodes[raw] = (result.unknownCodes[raw] ?? 0) + 1;
        continue;
      }
      result.entries.push({
        person,
        date: `${month}-${String(day).padStart(2, "0")}`,
        kind: code.kind,
        code: raw,
        shiftStart: code.start ? toLiveMinutes(code.start) : null,
        shiftEnd: code.end ? toLiveMinutes(code.end) : null,
      });
    }
  }
  if (result.people.length === 0) return { ok: false, error: "ไม่พบรายชื่อพนักงานใต้แถวหัวตาราง" };
  return { ok: true, result };
}

// The sheet's job titles mapped to the Producer positions the app knows.
export function positionFromTitle(title: string): string {
  const t = key(title);
  if (t.includes("lead")) return "Producer Team Lead";
  if (t.includes("senior")) return "Senior Producer";
  if (t.includes("jr") || t.includes("junior")) return "Jr. Producer";
  if (t.includes("producer")) return "Producer";
  return "Jr. Producer";
}

// ---- .xlsx support: the browser reads the workbook, then the chosen tab is
// turned into the same tab-separated text a paste from Google Sheets gives.

export type CellValue = string | number | boolean | Date | null | undefined;

export function rowsToText(rows: CellValue[][]): string {
  return rows
    .map((row) =>
      row
        .map((v) => {
          if (v === null || v === undefined) return "";
          if (v instanceof Date) return v.toISOString().slice(0, 10);
          return String(v).replace(/[\t\n\r]+/g, " ");
        })
        .join("\t"),
    )
    .join("\n");
}

// The tab that holds the shift grid, e.g. "2. Shift Planning".
export function pickShiftSheet(names: string[]): string | null {
  return (
    names.find((n) => /shift\s*planning/i.test(n)) ??
    names.find((n) => /shift|กะ/i.test(n)) ??
    null
  );
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "11. Live Calendar (Nov 2026).xlsx" → "2026-11"; null when there's no hint.
export function guessMonth(fileName: string): string | null {
  const m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s._-]*(20\d{2})\b/i.exec(fileName);
  if (!m) return null;
  return `${m[2]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, "0")}`;
}
