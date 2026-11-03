// Reads the Producer list sheet: a header row with Employee ID, Name,
// Position and Squad (Thai headers work too), one person per row below.

import { positionFromTitle } from "./shift-sheet";

export const PRODUCER_POSITIONS = ["Producer Team Lead", "Senior Producer", "Producer", "Jr. Producer"];

export interface SheetProducer {
  row: number; // 1-based row in the sheet, for messages
  employeeId: string | null;
  name: string;
  position: string | null; // null = not given (keep / default)
  squad: string | null; // null = not given (keep)
  team: string | null; // null = not given (keep)
}

export type ProducerSheetParse = { ok: true; people: SheetProducer[] } | { ok: false; error: string };

const MAX_ROWS = 2000;
const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const head = (v: unknown) => clean(v).toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");

const COLUMNS = {
  employeeId: ["employeeid", "empid", "id", "รหัสพนักงาน", "รหัส"],
  name: ["name", "ชื่อ", "ชื่อเล่น", "nickname"],
  position: ["position", "title", "ตำแหน่ง"],
  squad: ["squad", "brandsquad", "สควอด", "แบรนด์"],
  team: ["team", "pdteam", "pdcluster", "ทีม"],
} as const;

export function parseProducerSheet(rows: unknown[][]): ProducerSheetParse {
  const headerIndex = rows.slice(0, 20).findIndex((r) => r.some((c) => (COLUMNS.name as readonly string[]).includes(head(c))));
  if (headerIndex < 0) return { ok: false, error: "ไม่พบแถวหัวตารางที่มีคอลัมน์ Name / ชื่อ — ใช้ไฟล์ Template" };
  const header = rows[headerIndex].map(head);
  const col = (k: keyof typeof COLUMNS) => header.findIndex((h) => (COLUMNS[k] as readonly string[]).includes(h));
  const at = { employeeId: col("employeeId"), name: col("name"), position: col("position"), squad: col("squad"), team: col("team") };

  const people: SheetProducer[] = [];
  const body = rows.slice(headerIndex + 1);
  if (body.length > MAX_ROWS) return { ok: false, error: `ไฟล์ยาวเกิน ${MAX_ROWS} แถว` };
  body.forEach((r, i) => {
    const name = clean(r[at.name]);
    if (!name) return;
    const rawPosition = at.position >= 0 ? clean(r[at.position]) : "";
    const exact = PRODUCER_POSITIONS.find((p) => p.toLowerCase() === rawPosition.toLowerCase());
    people.push({
      row: headerIndex + i + 2,
      employeeId: at.employeeId >= 0 ? clean(r[at.employeeId]).replace(/\.0$/, "") || null : null,
      name,
      position: rawPosition ? (exact ?? positionFromTitle(rawPosition)) : null,
      squad: at.squad >= 0 && clean(r[at.squad]) ? clean(r[at.squad]) : null,
      team: at.team >= 0 && clean(r[at.team]) ? clean(r[at.team]) : null,
    });
  });
  if (people.length === 0) return { ok: false, error: "ไม่พบรายชื่อในไฟล์" };
  return { ok: true, people };
}
