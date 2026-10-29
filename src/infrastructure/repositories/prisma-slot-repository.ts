import type { Prisma, SlotStatus as DbSlotStatus } from "@prisma/client";
import type {
  SlotListItem,
  SlotRecord,
  SlotRepository,
  SlotWriteSession,
  StatusCounts,
} from "@/application/ports";
import type { SlotStatus } from "@/domain/slot-rules";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { prisma } from "../prisma";

type Db = Prisma.TransactionClient;

const toDbStatus = (s: SlotStatus) => s.toUpperCase() as DbSlotStatus;
const fromDbStatus = (s: DbSlotStatus) => s.toLowerCase() as SlotStatus;

const recordSelect = {
  id: true,
  date: true,
  startMinute: true,
  endMinute: true,
  roomId: true,
  brandId: true,
  campaign: true,
  requirement: true,
  aeId: true,
  mcId: true,
  producerId: true,
  admin1Id: true,
  status: true,
} satisfies Prisma.SlotSelect;

type RecordRow = Prisma.SlotGetPayload<{ select: typeof recordSelect }>;

function toRecord(row: RecordRow): SlotRecord {
  return { ...row, date: toIsoDate(row.date), status: fromDbStatus(row.status) };
}

const listSelect = {
  ...recordSelect,
  brand: { select: { brandName: true, platform: true } },
  room: { select: { shortName: true } },
  ae: { select: { name: true } },
  mc: { select: { nickname: true } },
  planner: { select: { name: true } },
  producer: { select: { name: true } },
  admin1: { select: { name: true } },
  admin2: { select: { name: true } },
} satisfies Prisma.SlotSelect;

function sessionFor(db: Db): SlotWriteSession {
  return {
    async listOnDate(date) {
      const rows = await db.slot.findMany({ where: { date: fromIsoDate(date) }, select: recordSelect });
      return rows.map(toRecord);
    },
    async create(slot) {
      const row = await db.slot.create({
        data: { ...slot, date: fromIsoDate(slot.date), status: "WAITING" },
        select: recordSelect,
      });
      return toRecord(row);
    },
    async update(id, changes) {
      const row = await db.slot.update({
        where: { id },
        data: { ...changes, date: fromIsoDate(changes.date) },
        select: recordSelect,
      });
      return toRecord(row);
    },
    async remove(id) {
      await db.slot.delete({ where: { id } });
    },
    async setStatus(id, status) {
      await db.slot.update({ where: { id }, data: { status: toDbStatus(status) } });
    },
    async setMc(id, mcId, plannerId) {
      await db.slot.update({ where: { id }, data: { mcId, plannerId } });
    },
  };
}

export const prismaSlotRepository: SlotRepository = {
  async countAlertsOn(date) {
    const groups = await prisma.slot.groupBy({
      by: ["status"],
      where: { date: fromIsoDate(date), status: { in: ["CONFLICT", "WAITING"] } },
      _count: true,
    });
    const count = (status: DbSlotStatus) => groups.find((g) => g.status === status)?._count ?? 0;
    return { conflict: count("CONFLICT"), waiting: count("WAITING") };
  },

  async findById(id) {
    const row = await prisma.slot.findUnique({ where: { id }, select: recordSelect });
    return row ? toRecord(row) : null;
  },

  async list(filter) {
    const rows = await prisma.slot.findMany({
      where: {
        date: { gte: fromIsoDate(filter.from), lte: fromIsoDate(filter.to) },
        aeId: filter.aeId,
        roomId: filter.roomId,
        status: filter.status ? toDbStatus(filter.status) : undefined,
        brand: filter.brandName ? { brandName: filter.brandName } : undefined,
      },
      select: listSelect,
      orderBy: [{ date: "asc" }, { startMinute: "asc" }, { room: { sortOrder: "asc" } }],
      take: filter.limit,
    });
    return rows.map(
      ({ brand, room, ae, mc, planner, producer, admin1, admin2, ...row }): SlotListItem => ({
        ...toRecord(row),
        brandName: brand.brandName,
        platform: brand.platform,
        roomName: room.shortName,
        aeName: ae.name,
        mcName: mc?.nickname ?? null,
        plannerName: planner?.name ?? null,
        producerName: producer?.name ?? null,
        admin1Name: admin1?.name ?? null,
        admin2Name: admin2?.name ?? null,
      }),
    );
  },

  async countByDay(from, to) {
    const groups = await prisma.slot.groupBy({
      by: ["date", "status"],
      where: { date: { gte: fromIsoDate(from), lte: fromIsoDate(to) } },
      _count: true,
    });
    const result: Record<string, StatusCounts> = {};
    for (const g of groups) {
      const day = (result[toIsoDate(g.date)] ??= {});
      day[fromDbStatus(g.status)] = g._count;
    }
    return result;
  },

  async countByBrand(from, to, aeId) {
    const groups = await prisma.slot.groupBy({
      by: ["brandId", "status"],
      where: { date: { gte: fromIsoDate(from), lte: fromIsoDate(to) }, aeId },
      _count: true,
    });
    const brands = await prisma.brand.findMany({
      where: { id: { in: [...new Set(groups.map((g) => g.brandId))] } },
    });
    return brands
      .map((b) => {
        const counts: StatusCounts = {};
        for (const g of groups.filter((g) => g.brandId === b.id)) {
          counts[fromDbStatus(g.status)] = g._count;
        }
        return { brandName: b.brandName, platform: b.platform, counts };
      })
      .sort((a, b) => `${a.brandName}${a.platform}`.localeCompare(`${b.brandName}${b.platform}`));
  },

  withDatesLocked(dates, work) {
    // Lock in a fixed order so two sessions locking the same pair can't deadlock.
    const ordered = [...new Set(dates)].sort();
    return prisma.$transaction(async (tx) => {
      for (const date of ordered) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"slots:" + date}))`;
      }
      return work(sessionFor(tx));
    });
  },
};
