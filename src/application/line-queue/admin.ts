// Planner's view: link codes to hand to each MC, who has linked LINE, how
// many upcoming queues each MC has confirmed, and a LINE reminder.

import type { SessionUser } from "../auth/login";
import { mcKey } from "@/domain/sheet-queue";
import type { Clock, LineGateway, LineQueueRepository, McLineLink, QueueAnswer } from "../ports";

const PLANNERS = ["PLANNER", "MANAGER"];

export interface LineMcRow {
  mcName: string;
  link: McLineLink;
  upcoming: number;
  confirmed: number;
  declined: number;
}

export interface LineMcPageData {
  lastSync: { syncedAt: string; rows: number; sheets: string } | null;
  rows: LineMcRow[];
  declines: (QueueAnswer & { brand: string; channel: string; date: string; startMinute: number; endMinute: number })[];
  lineEnabled: boolean;
  canManage: boolean;
}

type Deps = { lineQueues: LineQueueRepository; line: LineGateway; clock: Clock; newCode: () => string };
type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

export async function getLineMcPage(deps: Deps, user: SessionUser): Promise<LineMcPageData> {
  const today = deps.clock.today();
  const [queues, lastSync] = await Promise.all([deps.lineQueues.queues({ from: today }), deps.lineQueues.lastSync()]);
  let links = await deps.lineQueues.links();

  // Every MC in the sheet gets a link code (spelling as first seen).
  const known = new Set(links.map((l) => mcKey(l.mcName)));
  const missing = new Map<string, string>();
  for (const q of queues) if (!known.has(mcKey(q.mcName))) missing.set(mcKey(q.mcName), q.mcName);
  if (missing.size && PLANNERS.includes(user.role)) {
    const used = new Set(links.map((l) => l.code));
    const fresh = [...missing.values()].map((mcName) => {
      let code = deps.newCode();
      while (used.has(code)) code = deps.newCode();
      used.add(code);
      return { mcName, code };
    });
    await deps.lineQueues.createLinks(fresh);
    links = await deps.lineQueues.links();
  }

  const answers = new Map((await deps.lineQueues.answers(queues.map((q) => q.key))).map((a) => [a.key, a]));
  const rows = links
    .map((link) => {
      const mine = queues.filter((q) => mcKey(q.mcName) === mcKey(link.mcName));
      const status = mine.map((q) => answers.get(q.key)?.status);
      return {
        mcName: link.mcName,
        link,
        upcoming: mine.length,
        confirmed: status.filter((s) => s === "confirmed").length,
        declined: status.filter((s) => s === "declined").length,
      };
    })
    .sort((a, b) => b.upcoming - a.upcoming || a.mcName.localeCompare(b.mcName));
  const byKey = new Map(queues.map((q) => [q.key, q]));
  const declines = [...answers.values()]
    .filter((a) => a.status === "declined" && byKey.has(a.key))
    .map((a) => {
      const q = byKey.get(a.key)!;
      return { ...a, brand: q.brand, channel: q.channel, date: q.date, startMinute: q.startMinute, endMinute: q.endMinute };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute);

  return { lastSync, rows, declines, lineEnabled: deps.line.enabled, canManage: PLANNERS.includes(user.role) };
}

export async function resetLineLink(deps: Deps, user: SessionUser, mcName: string): Promise<Result> {
  if (!PLANNERS.includes(user.role)) return { ok: false, error: "เฉพาะ Planner" };
  if (!(await deps.lineQueues.links()).some((l) => l.mcName === mcName)) return { ok: false, error: "ไม่พบ MC นี้" };
  await deps.lineQueues.setLineUser(mcName, null, null, deps.newCode());
  return { ok: true, value: undefined };
}

// One LINE message to each linked MC who still has unanswered queues.
export async function remindMcs(deps: Deps, user: SessionUser, liffUrl: string): Promise<Result<{ sent: number; failed: number }>> {
  if (!PLANNERS.includes(user.role)) return { ok: false, error: "เฉพาะ Planner" };
  if (!deps.line.enabled) return { ok: false, error: "ยังไม่ได้ตั้งค่า LINE (LINE_CHANNEL_ACCESS_TOKEN)" };
  const page = await getLineMcPage(deps, user);
  const targets = page.rows.filter((r) => r.link.lineUserId && r.upcoming - r.confirmed - r.declined > 0);
  let sent = 0;
  let failed = 0;
  for (const r of targets) {
    const waiting = r.upcoming - r.confirmed - r.declined;
    const ok = await deps.line.push(r.link.lineUserId!, `สวัสดีค่ะ ${r.mcName} 🙏\nมีคิวไลฟ์รอยืนยัน ${waiting} คิว\nกดดูและยืนยันได้ที่: ${liffUrl}`);
    if (ok) sent++;
    else failed++;
  }
  return { ok: true, value: { sent, failed } };
}
