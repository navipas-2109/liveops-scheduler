// Producer Database upload: each sheet row is matched to a person by
// employee ID, then by name. Matched people are updated, the rest added.
// Blank Position or Squad cells keep what the person already has.

import type { SessionUser } from "../auth/login";
import { parseProducerSheet, type SheetProducer } from "@/domain/producer-sheet";
import type { Producer, ProducerRepository } from "../ports";
import { saveProducer } from "./producers";

export type ProducerAction = "new" | "update" | "same" | "error";

export interface ProducerImportItem {
  row: number;
  name: string;
  employeeId: string | null;
  position: string;
  squad: string;
  action: ProducerAction;
  matchedId: string | null;
  changes: string[]; // e.g. "Squad: Adidas → Puma"
  error: string | null;
}

export interface ProducerImportPreview {
  items: ProducerImportItem[];
  counts: Record<ProducerAction, number>;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const EDITORS = ["OPERATION", "PLANNER", "MANAGER"];
const lower = (s: string) => s.toLowerCase();

function planRow(person: SheetProducer, existing: Producer[], seen: { ids: Set<string>; names: Set<string> }): ProducerImportItem {
  const base = { row: person.row, name: person.name, employeeId: person.employeeId, matchedId: null, changes: [] };
  const fail = (error: string): ProducerImportItem => ({
    ...base,
    position: person.position ?? "",
    squad: person.squad ?? "",
    action: "error",
    error,
  });

  if (person.employeeId && !/^[A-Za-z0-9-]{1,20}$/.test(person.employeeId)) return fail("รหัสพนักงานใช้ได้เฉพาะ A-Z, 0-9 และ -");
  if (person.name.length > 60) return fail("ชื่อยาวเกินไป");
  if (person.employeeId && seen.ids.has(person.employeeId)) return fail(`รหัส ${person.employeeId} ซ้ำในไฟล์`);
  if (seen.names.has(lower(person.name))) return fail(`ชื่อ ${person.name} ซ้ำในไฟล์`);
  if (person.employeeId) seen.ids.add(person.employeeId);
  seen.names.add(lower(person.name));

  const byId = person.employeeId ? existing.find((p) => p.employeeId === person.employeeId) : undefined;
  const byName = existing.find((p) => lower(p.name) === lower(person.name));
  if (!byId && byName?.employeeId && person.employeeId) {
    return fail(`${byName.name} มีรหัส ${byName.employeeId} อยู่แล้ว (ในไฟล์คือ ${person.employeeId})`);
  }
  const match = byId ?? byName;
  if (match && byName && byName.id !== match.id) return fail(`ชื่อ ${person.name} เป็นของพนักงานอีกคน (รหัส ${byName.employeeId ?? "—"})`);

  const target = {
    employeeId: person.employeeId ?? match?.employeeId ?? null,
    position: person.position ?? match?.position ?? "Jr. Producer",
    squad: person.squad ?? match?.squad ?? "",
  };
  if (!match) return { ...base, ...target, action: "new", error: null };

  const changes: string[] = [];
  if (match.name !== person.name) changes.push(`ชื่อ: ${match.name} → ${person.name}`);
  if (match.employeeId !== target.employeeId) changes.push(`รหัส: ${match.employeeId ?? "—"} → ${target.employeeId}`);
  if (match.position !== target.position) changes.push(`ตำแหน่ง: ${match.position} → ${target.position}`);
  if (match.squad !== target.squad) changes.push(`Squad: ${match.squad || "—"} → ${target.squad || "—"}`);
  return { ...base, ...target, matchedId: match.id, changes, action: changes.length ? "update" : "same", error: null };
}

async function buildPreview(deps: { producers: ProducerRepository }, rows: unknown[][]): Promise<Result<ProducerImportPreview>> {
  const parsed = parseProducerSheet(rows);
  if (!parsed.ok) return parsed;
  const existing = await deps.producers.listAll();
  const seen = { ids: new Set<string>(), names: new Set<string>() };
  const items = parsed.people.map((p) => planRow(p, existing, seen));
  const counts = { new: 0, update: 0, same: 0, error: 0 };
  for (const i of items) counts[i.action]++;
  return { ok: true, value: { items, counts } };
}

export async function previewProducerImport(
  deps: { producers: ProducerRepository },
  user: SessionUser,
  rows: unknown[][],
): Promise<Result<ProducerImportPreview>> {
  if (!EDITORS.includes(user.role)) return { ok: false, error: "คุณไม่มีสิทธิ์นำเข้าข้อมูลพนักงาน" };
  return buildPreview(deps, rows);
}

export async function importProducers(
  deps: { producers: ProducerRepository },
  user: SessionUser,
  rows: unknown[][],
): Promise<Result<{ added: number; updated: number; skipped: { name: string; reason: string }[] }>> {
  if (!EDITORS.includes(user.role)) return { ok: false, error: "คุณไม่มีสิทธิ์นำเข้าข้อมูลพนักงาน" };
  const preview = await buildPreview(deps, rows);
  if (!preview.ok) return preview;
  const out = { added: 0, updated: 0, skipped: [] as { name: string; reason: string }[] };
  for (const item of preview.value.items) {
    if (item.action === "same") continue;
    if (item.action === "error") {
      out.skipped.push({ name: `แถว ${item.row} ${item.name}`, reason: item.error ?? "" });
      continue;
    }
    const r = await saveProducer(
      deps,
      user,
      { name: item.name, employeeId: item.employeeId, position: item.position, squad: item.squad },
      item.matchedId ?? undefined,
    );
    if (!r.ok) out.skipped.push({ name: `แถว ${item.row} ${item.name}`, reason: r.error });
    else if (item.action === "new") out.added++;
    else out.updated++;
  }
  return { ok: true, value: out };
}
