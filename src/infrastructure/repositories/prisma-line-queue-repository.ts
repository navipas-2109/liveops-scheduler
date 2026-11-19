import type { LineQueueRepository, QueueStatus } from "@/application/ports";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { prisma } from "../prisma";

const BATCH = 1000;

export const prismaLineQueueRepository: LineQueueRepository = {
  async replaceQueues(queues, sheets) {
    const rows = queues.map((q) => ({ ...q, date: fromIsoDate(q.date) }));
    await prisma.$transaction(async (tx) => {
      await tx.sheetQueue.deleteMany({});
      for (let i = 0; i < rows.length; i += BATCH) {
        await tx.sheetQueue.createMany({ data: rows.slice(i, i + BATCH) });
      }
      const sync = { syncedAt: new Date(), rows: rows.length, sheets: sheets.join(", ") };
      await tx.sheetSync.upsert({ where: { id: 1 }, create: { id: 1, ...sync }, update: sync });
    });
  },
  async lastSync() {
    const s = await prisma.sheetSync.findUnique({ where: { id: 1 } });
    return s ? { syncedAt: s.syncedAt.toISOString(), rows: s.rows, sheets: s.sheets } : null;
  },
  async queues({ from, mcName }) {
    const rows = await prisma.sheetQueue.findMany({
      where: {
        ...(from ? { date: { gte: fromIsoDate(from) } } : {}),
        ...(mcName ? { mcName: { equals: mcName, mode: "insensitive" } } : {}),
      },
      orderBy: [{ date: "asc" }, { startMinute: "asc" }, { brand: "asc" }],
    });
    return rows.map((r) => ({
      key: r.key,
      mcName: r.mcName,
      brand: r.brand,
      channel: r.channel,
      date: toIsoDate(r.date),
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      note: r.note,
      bu: r.bu,
      sheet: r.sheet,
      row: r.row,
    }));
  },
  async answers(keys) {
    const rows = await prisma.queueAnswer.findMany({ where: keys ? { key: { in: keys } } : {} });
    return rows.map((a) => ({ ...a, status: a.status as QueueStatus, answeredAt: a.answeredAt.toISOString() }));
  },
  async saveAnswers(answers) {
    await prisma.$transaction(
      answers.map((a) =>
        prisma.queueAnswer.upsert({
          where: { key: a.key },
          create: a,
          update: { status: a.status, reason: a.reason, mcName: a.mcName, answeredAt: new Date() },
        }),
      ),
    );
  },
  async links() {
    const rows = await prisma.mcLineLink.findMany({ orderBy: { mcName: "asc" } });
    return rows.map((l) => ({
      mcName: l.mcName,
      code: l.code,
      lineUserId: l.lineUserId,
      lineName: l.lineName,
      linkedAt: l.linkedAt?.toISOString() ?? null,
    }));
  },
  async createLinks(links) {
    if (links.length) await prisma.mcLineLink.createMany({ data: links, skipDuplicates: true });
  },
  async setLineUser(mcName, lineUserId, lineName, newCode) {
    await prisma.mcLineLink.update({
      where: { mcName },
      data: { lineUserId, lineName, linkedAt: lineUserId ? new Date() : null, ...(newCode ? { code: newCode } : {}) },
    });
  },
};
