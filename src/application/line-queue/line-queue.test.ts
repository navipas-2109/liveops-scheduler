import { describe, expect, it } from "vitest";
import type { RawSheetRow, SheetQueueRow } from "@/domain/sheet-queue";
import type { LineGateway, LineQueueRepository, McLineLink, NotifyChannel, QueueAnswer } from "../ports";
import { getLineMcPage, remindMcs, resetLineLink } from "./admin";
import { answerMyQueues, getMyQueue, linkMyLine } from "./my-queue";
import { answersForSheet, syncSheet } from "./sheet-sync";

function fakes() {
  let queues: SheetQueueRow[] = [];
  const answers = new Map<string, QueueAnswer>();
  const links: McLineLink[] = [];
  const pushed: string[] = [];
  const sent: { channels: NotifyChannel[]; text: string }[] = [];
  let n = 0;
  const lineQueues: LineQueueRepository = {
    replaceQueues: async (q) => void (queues = q),
    lastSync: async () => null,
    queues: async ({ from, mcName }) =>
      queues.filter((q) => (!from || q.date >= from) && (!mcName || q.mcName.toLowerCase() === mcName.toLowerCase())),
    answers: async (keys) => [...answers.values()].filter((a) => !keys || keys.includes(a.key)),
    saveAnswers: async (list) => list.forEach((a) => answers.set(a.key, { ...a, answeredAt: "t" })),
    links: async () => links.map((l) => ({ ...l })),
    createLinks: async (list) => list.forEach((l) => links.push({ ...l, lineUserId: null, lineName: null, linkedAt: null })),
    setLineUser: async (mcName, lineUserId, lineName, newCode) => {
      const l = links.find((x) => x.mcName === mcName)!;
      Object.assign(l, { lineUserId, lineName, linkedAt: lineUserId ? "t" : null }, newCode ? { code: newCode } : {});
    },
  };
  const line: LineGateway = {
    enabled: true,
    verifyIdToken: async () => null,
    push: async (to, text) => (pushed.push(`${to}: ${text.split("\n")[1]}`), true),
    reply: async () => {},
  };
  const deps = {
    lineQueues,
    line,
    clock: { today: () => "2026-11-30", nowMinute: () => 600 },
    newCode: () => `CODE${++n}`,
    notifier: { notify: async (channels: NotifyChannel[], text: string) => void sent.push({ channels, text }) },
  };
  return { deps, answers, links, pushed, sent };
}

const row = (r: Partial<RawSheetRow>): RawSheetRow => ({
  sheet: "DEC X MC", row: 4, mc: "Boss", brand: "puma", channel: "TikTok", date: "1 Dec", start: "7:30", end: "10:30", ...r,
});
const planner = { userId: "p", name: "Planner", role: "PLANNER" as const };
const boss = { userId: "U-boss", name: "Boss LINE" };

describe("MC queue confirmation in LINE", () => {
  it("syncs the sheet, hands out codes, links LINE and answers", async () => {
    const { deps, sent } = fakes();
    const sync = await syncSheet(deps, [
      row({}),
      row({ row: 5, start: "11:30", end: "14:30" }),
      row({ row: 6, mc: "Sari", brand: "cosrx" }),
      row({ row: 7, mc: "Boss", date: "29 Nov" }), // already past
    ]);
    expect(sync.ok && sync.value.queues).toBe(4);

    const page = await getLineMcPage(deps, planner);
    expect(page.rows.map((r) => [r.mcName, r.link.code, r.upcoming])).toEqual([
      ["Boss", "CODE1", 2],
      ["Sari", "CODE2", 1],
    ]);

    expect(await getMyQueue(deps, boss)).toEqual({ linked: false });
    expect((await linkMyLine(deps, boss, "nope")).ok).toBe(false);
    expect(await linkMyLine(deps, boss, " code1 ")).toEqual({ ok: true, value: "Boss" });
    expect((await linkMyLine(deps, { userId: "U-other", name: "x" }, "CODE1")).ok).toBe(false); // already taken

    const mine = await getMyQueue(deps, boss);
    if (!mine.linked) throw new Error("not linked");
    expect(mine.items.map((i) => [i.date, i.startMinute, i.status])).toEqual([
      ["2026-12-01", 450, null],
      ["2026-12-01", 690, null],
    ]);

    // Only the MC's own, upcoming queues can be answered.
    const sariKey = (await deps.lineQueues.queues({ mcName: "Sari" }))[0].key;
    expect((await answerMyQueues(deps, boss, [sariKey], "confirmed", "")).ok).toBe(false);
    expect(await answerMyQueues(deps, boss, [mine.items[0].key], "confirmed", "")).toEqual({ ok: true, value: 1 });
    expect(await answerMyQueues(deps, boss, [mine.items[1].key], "declined", "ติดธุระ")).toEqual({ ok: true, value: 1 });
    expect(sent[0].text).toContain("MC Boss รับคิวไม่ได้ 1 คิว — ติดธุระ");

    const after = await getLineMcPage(deps, planner);
    expect(after.rows[0]).toMatchObject({ mcName: "Boss", confirmed: 1, declined: 1 });
    expect(after.declines.map((d) => [d.mcName, d.reason])).toEqual([["Boss", "ติดธุระ"]]);

    const back = await answersForSheet(deps);
    expect(back.map((b) => [b.row, b.status]).sort((x, y) => Number(x[0]) - Number(y[0]))).toEqual([
      [4, "ยืนยันแล้ว"],
      [5, "รับไม่ได้"],
      [6, "รอ MC"],
      [7, "รอ MC"],
    ]);
  });

  it("re-sorting the sheet keeps answers; a changed MC is a new, unanswered queue", async () => {
    const { deps } = fakes();
    await syncSheet(deps, [row({})]);
    await getLineMcPage(deps, planner);
    await linkMyLine(deps, boss, "CODE1");
    const key = (await deps.lineQueues.queues({}))[0].key;
    await answerMyQueues(deps, boss, [key], "confirmed", "");

    await syncSheet(deps, [row({ row: 40 }), row({ row: 41, mc: "Sari" })]);
    const mine = await getMyQueue(deps, boss);
    expect(mine.linked && mine.items[0].status).toBe("confirmed");
    await syncSheet(deps, [row({ mc: "Sari" })]);
    const gone = await getMyQueue(deps, boss);
    expect(gone.linked && gone.items).toEqual([]);
  });

  it("reminds only linked MCs who still have queues to answer; Planner can unlink", async () => {
    const { deps, pushed, links } = fakes();
    await syncSheet(deps, [row({}), row({ row: 5, mc: "Sari" }), row({ row: 6, mc: "June" })]);
    await getLineMcPage(deps, planner);
    await linkMyLine(deps, boss, "CODE1");
    await linkMyLine(deps, { userId: "U-sari", name: "Sari" }, "CODE2");
    await answerMyQueues(deps, { userId: "U-sari", name: "Sari" }, [(await deps.lineQueues.queues({ mcName: "Sari" }))[0].key], "confirmed", "");

    expect((await remindMcs(deps, { ...planner, role: "AE" }, "https://liff")).ok).toBe(false);
    expect(await remindMcs(deps, planner, "https://liff")).toEqual({ ok: true, value: { sent: 1, failed: 0 } });
    expect(pushed).toEqual(["U-boss: มีคิวไลฟ์รอยืนยัน 1 คิว"]);

    expect((await resetLineLink(deps, planner, "Boss")).ok).toBe(true);
    expect(links[0]).toMatchObject({ mcName: "Boss", lineUserId: null });
    expect(links[0].code).not.toBe("CODE1");
  });
});
