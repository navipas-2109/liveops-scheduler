// The MC's own page inside LINE: link their LINE once with a code, then see
// and answer their upcoming queues.

import { mcKey, type SheetQueueRow } from "@/domain/sheet-queue";
import { timeRangeLabel } from "../slots/save-slot";
import type { Clock, LineQueueRepository, Notifier, QueueStatus } from "../ports";

export interface LineUser {
  userId: string;
  name: string;
}

export interface MyQueueItem extends SheetQueueRow {
  status: QueueStatus | null;
  reason: string;
}

export type MyQueue = { linked: false } | { linked: true; mcName: string; items: MyQueueItem[] };

type Deps = { lineQueues: LineQueueRepository; clock: Clock };
type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

async function linkOf(deps: Deps, user: LineUser) {
  return (await deps.lineQueues.links()).find((l) => l.lineUserId === user.userId) ?? null;
}

export async function getMyQueue(deps: Deps, user: LineUser): Promise<MyQueue> {
  const link = await linkOf(deps, user);
  if (!link) return { linked: false };
  const queues = await deps.lineQueues.queues({ from: deps.clock.today(), mcName: link.mcName });
  const answers = new Map((await deps.lineQueues.answers(queues.map((q) => q.key))).map((a) => [a.key, a]));
  return {
    linked: true,
    mcName: link.mcName,
    items: queues.map((q) => ({ ...q, status: answers.get(q.key)?.status ?? null, reason: answers.get(q.key)?.reason ?? "" })),
  };
}

export async function linkMyLine(deps: Deps, user: LineUser, code: string): Promise<Result<string>> {
  const links = await deps.lineQueues.links();
  const link = links.find((l) => l.code === code.trim().toUpperCase());
  if (!link) return { ok: false, error: "รหัสไม่ถูกต้อง — ขอรหัสจาก Planner" };
  const mine = links.find((l) => l.lineUserId === user.userId);
  if (mine && mine.mcName !== link.mcName) return { ok: false, error: `LINE นี้ผูกกับ ${mine.mcName} อยู่แล้ว — ให้ Planner ยกเลิกการผูกก่อน` };
  if (link.lineUserId && link.lineUserId !== user.userId) {
    return { ok: false, error: `รหัสนี้ถูกใช้กับ LINE อื่นแล้ว — ขอให้ Planner ยกเลิกการผูกของ ${link.mcName}` };
  }
  await deps.lineQueues.setLineUser(link.mcName, user.userId, user.name);
  return { ok: true, value: link.mcName };
}

export async function answerMyQueues(
  deps: Deps & { notifier: Notifier },
  user: LineUser,
  keys: string[],
  status: QueueStatus,
  reason: string,
): Promise<Result<number>> {
  const link = await linkOf(deps, user);
  if (!link) return { ok: false, error: "ยังไม่ได้ผูกบัญชี LINE" };
  if (reason.length > 200) return { ok: false, error: "เหตุผลยาวเกินไป" };
  const mine = await deps.lineQueues.queues({ from: deps.clock.today(), mcName: link.mcName });
  const chosen = mine.filter((q) => keys.includes(q.key) && mcKey(q.mcName) === mcKey(link.mcName));
  if (chosen.length === 0) return { ok: false, error: "ไม่พบคิวที่เลือก (อาจผ่านไปแล้วหรือถูกแก้ในชีต)" };
  await deps.lineQueues.saveAnswers(chosen.map((q) => ({ key: q.key, mcName: link.mcName, status, reason: reason.trim() })));
  if (status === "declined") {
    const list = chosen.map((q) => `• ${q.date} ${timeRangeLabel(q.startMinute, q.endMinute)} ${q.brand} (${q.channel})`).join("\n");
    await deps.notifier.notify(["planner"], `🙅 MC ${link.mcName} รับคิวไม่ได้ ${chosen.length} คิว${reason ? ` — ${reason}` : ""}\n${list}`);
  }
  return { ok: true, value: chosen.length };
}
