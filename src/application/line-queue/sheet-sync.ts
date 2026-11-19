// The Apps Script in the team's Google Sheet sends every queue row here, and
// reads back the answers to write them into a tab of the sheet.

import { parseSheetRows, type RawSheetRow } from "@/domain/sheet-queue";
import type { Clock, LineQueueRepository } from "../ports";
import { fromLiveMinutes } from "@/domain/time";

const MAX_ROWS = 20000;

export async function syncSheet(
  deps: { lineQueues: LineQueueRepository; clock: Clock },
  rows: RawSheetRow[],
): Promise<{ ok: true; value: { queues: number; skipped: { sheet: string; row: number; reason: string }[] } } | { ok: false; error: string }> {
  if (rows.length > MAX_ROWS) return { ok: false, error: `too many rows (max ${MAX_ROWS})` };
  const { queues, skipped } = parseSheetRows(rows, deps.clock.today());
  if (queues.length === 0) return { ok: false, error: "no queue rows found — check the sheet name and header row" };
  await deps.lineQueues.replaceQueues(queues, [...new Set(queues.map((q) => q.sheet))]);
  return { ok: true, value: { queues: queues.length, skipped } };
}

// Rows for the "MC Confirm (LINE)" tab: every current queue with its answer.
export async function answersForSheet(deps: { lineQueues: LineQueueRepository }) {
  const [queues, answers] = await Promise.all([deps.lineQueues.queues({}), deps.lineQueues.answers()]);
  const byKey = new Map(answers.map((a) => [a.key, a]));
  return queues.map((q) => {
    const a = byKey.get(q.key);
    return {
      sheet: q.sheet,
      row: q.row,
      mc: q.mcName,
      brand: q.brand,
      channel: q.channel,
      date: q.date,
      start: fromLiveMinutes(q.startMinute),
      end: fromLiveMinutes(q.endMinute),
      status: a ? (a.status === "confirmed" ? "ยืนยันแล้ว" : "รับไม่ได้") : "รอ MC",
      reason: a?.reason ?? "",
      answeredAt: a?.answeredAt ?? "",
    };
  });
}
