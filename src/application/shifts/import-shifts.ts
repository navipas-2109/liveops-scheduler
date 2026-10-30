import type { SessionUser } from "../auth/login";
import { parseShiftSheet, positionFromTitle, SHIFT_CODES, type SheetPerson } from "@/domain/shift-sheet";
import type { Producer, ProducerRepository, ShiftEntry, ShiftRepository } from "../ports";

export type MatchKind = "id" | "name" | "new";

export interface PersonPreview {
  name: string;
  employeeId: string | null;
  title: string;
  squad: string;
  match: MatchKind;
  existingName: string | null; // when matched, the name already in the app
  shifts: number;
}

export interface ImportPreview {
  month: string;
  people: PersonPreview[];
  codeCounts: Record<string, number>;
  unknownCodes: Record<string, number>;
  blankCells: number;
  entries: number;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const key = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

// Employee ID first; name only for people who don't have an ID in the app
// yet (the first import after the original 76 were loaded).
function matchPerson(person: SheetPerson, producers: Producer[]): { producer: Producer | null; match: MatchKind } {
  if (person.employeeId) {
    const byId = producers.find((p) => p.employeeId === person.employeeId);
    if (byId) return { producer: byId, match: "id" };
  }
  const byName = producers.find(
    (p) => key(p.name) === key(person.name) && (!p.employeeId || !person.employeeId),
  );
  if (byName) return { producer: byName, match: "name" };
  return { producer: null, match: "new" };
}

function canImport(user: SessionUser) {
  return user.role === "OPERATION" || user.role === "MANAGER";
}

export async function previewShiftImport(
  deps: { producers: ProducerRepository },
  user: SessionUser,
  input: { month: string; text: string },
): Promise<Result<ImportPreview>> {
  if (!canImport(user)) return { ok: false, error: "เฉพาะ Operation และ Manager เท่านั้นที่นำเข้ากะได้" };
  const parsed = parseShiftSheet(input.text, input.month);
  if (!parsed.ok) return parsed;
  const { people, entries, unknownCodes, blankCells } = parsed.result;
  const producers = await deps.producers.listAll();

  const codeCounts: Record<string, number> = {};
  for (const e of entries) codeCounts[e.code] = (codeCounts[e.code] ?? 0) + 1;

  return {
    ok: true,
    value: {
      month: input.month,
      people: people.map((p, i) => {
        const { producer, match } = matchPerson(p, producers);
        return {
          ...p,
          match,
          existingName: producer?.name ?? null,
          shifts: entries.filter((e) => e.person === i).length,
        };
      }),
      codeCounts,
      unknownCodes,
      blankCells,
      entries: entries.length,
    },
  };
}

// Adds new people, fills in IDs/squads/positions from the sheet, and replaces
// the month's shifts for everyone in the sheet. People not in the paste keep
// their shifts.
export async function importShifts(
  deps: { producers: ProducerRepository; shifts: ShiftRepository },
  user: SessionUser,
  input: { month: string; text: string },
): Promise<Result<{ people: number; added: number; entries: number }>> {
  if (!canImport(user)) return { ok: false, error: "เฉพาะ Operation และ Manager เท่านั้นที่นำเข้ากะได้" };
  const parsed = parseShiftSheet(input.text, input.month);
  if (!parsed.ok) return parsed;
  const { people, entries } = parsed.result;

  const producers = await deps.producers.listAll();
  const ids: string[] = [];
  let added = 0;
  for (const person of people) {
    const { producer } = matchPerson(person, producers);
    const fields = {
      position: positionFromTitle(person.title),
      squad: person.squad,
      employeeId: person.employeeId ?? producer?.employeeId ?? null,
    };
    let saved: Producer;
    if (producer) {
      saved = await deps.producers.update(producer.id, { ...fields, name: producer.name });
    } else {
      // Names must be unique in the app; a new person sharing a nickname
      // with someone else gets their ID added to tell them apart.
      const taken = producers.some((p) => key(p.name) === key(person.name));
      const name = taken && person.employeeId ? `${person.name} (${person.employeeId})` : person.name;
      saved = await deps.producers.create({ ...fields, name });
      added++;
    }
    producers.push(saved);
    ids.push(saved.id);
  }

  // A person listed twice keeps the later row's codes.
  const byKey = new Map<string, ShiftEntry>();
  for (const e of entries) {
    const producerId = ids[e.person];
    byKey.set(`${producerId}|${e.date}`, {
      producerId,
      date: e.date,
      kind: e.kind,
      code: e.code,
      shiftStart: e.shiftStart,
      shiftEnd: e.shiftEnd,
    });
  }
  const [y, m] = input.month.split("-").map(Number);
  const to = `${input.month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  await deps.shifts.replace(`${input.month}-01`, to, [...new Set(ids)], [...byKey.values()]);
  return { ok: true, value: { people: new Set(ids).size, added, entries: byKey.size } };
}

export const SHIFT_CODE_LIST = Object.entries(SHIFT_CODES).map(([code, c]) => ({ code, ...c }));
