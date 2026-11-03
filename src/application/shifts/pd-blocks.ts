// Planners close time for some Producers (training, meetings, another job):
// no live can be booked with that PD during a closed range.

import type { SessionUser } from "../auth/login";
import { fromIsoDate, isValidIsoDate, LIVE_DAY_END, LIVE_DAY_START, rangesOverlap, toIsoDate } from "@/domain/time";
import type { NewPdBlock, PdBlock, PdBlockRepository, ProducerRepository } from "../ports";

type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

export const BLOCKERS = ["PLANNER", "MANAGER"];
const MAX_DAYS = 62;

export interface BlockInput {
  producerIds: string[];
  from: string;
  to: string;
  startMinute: number;
  endMinute: number;
  note: string;
}

function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (const d = fromIsoDate(from); toIsoDate(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) out.push(toIsoDate(d));
  return out;
}

export async function closePdTime(
  deps: { pdBlocks: PdBlockRepository; producers: ProducerRepository },
  user: SessionUser,
  input: BlockInput,
): Promise<Result<number>> {
  if (!BLOCKERS.includes(user.role)) return { ok: false, error: "ปิดเวลา PD ได้เฉพาะ Planner" };
  if (input.producerIds.length === 0) return { ok: false, error: "กรุณาเลือก PD อย่างน้อย 1 คน" };
  if (!isValidIsoDate(input.from) || !isValidIsoDate(input.to) || input.to < input.from) {
    return { ok: false, error: "ช่วงวันที่ไม่ถูกต้อง" };
  }
  const dates = datesBetween(input.from, input.to);
  if (dates.length > MAX_DAYS) return { ok: false, error: `ปิดได้ครั้งละไม่เกิน ${MAX_DAYS} วัน` };
  const { startMinute: s, endMinute: e } = input;
  if (!Number.isInteger(s) || !Number.isInteger(e) || s < LIVE_DAY_START || e > LIVE_DAY_END || e <= s) {
    return { ok: false, error: "ช่วงเวลาไม่ถูกต้อง (07:00–02:00)" };
  }
  if (input.note.length > 100) return { ok: false, error: "หมายเหตุยาวเกินไป" };
  const known = new Set((await deps.producers.listAll()).map((p) => p.id));
  const ids = [...new Set(input.producerIds)];
  if (ids.some((id) => !known.has(id))) return { ok: false, error: "ไม่พบ PD ที่เลือก" };

  const blocks: NewPdBlock[] = ids.flatMap((producerId) =>
    dates.map((date) => ({ producerId, date, startMinute: s, endMinute: e, note: input.note.trim() })),
  );
  return { ok: true, value: await deps.pdBlocks.createMany(blocks, user.userId) };
}

export async function reopenPdTime(
  deps: { pdBlocks: PdBlockRepository },
  user: SessionUser,
  ids: string[],
): Promise<Result> {
  if (!BLOCKERS.includes(user.role)) return { ok: false, error: "เปิดเวลา PD ได้เฉพาะ Planner" };
  await deps.pdBlocks.remove(ids.slice(0, 500));
  return { ok: true, value: undefined };
}

// The closed range, if any, that stops booking these PDs for this live.
export async function closedFor(
  pdBlocks: PdBlockRepository,
  live: { date: string; startMinute: number; endMinute: number },
  producerIds: (string | null | undefined)[],
): Promise<PdBlock | null> {
  const ids = producerIds.filter((id): id is string => !!id);
  if (ids.length === 0) return null;
  const blocks = await pdBlocks.listInRange(live.date, live.date);
  return blocks.find((b) => ids.includes(b.producerId) && rangesOverlap(b, live)) ?? null;
}
