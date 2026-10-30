import type { ProducerPosition, ShiftKind as DbShiftKind } from "@prisma/client";
import type { Producer, ProducerRepository, ShiftKind, ShiftRepository } from "@/application/ports";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { prisma } from "../prisma";

const POSITION_LABEL: Record<ProducerPosition, string> = {
  TEAM_LEAD: "Producer Team Lead",
  SENIOR: "Senior Producer",
  PRODUCER: "Producer",
  JR_PRODUCER: "Jr. Producer",
};
const POSITION_ENUM = Object.fromEntries(
  Object.entries(POSITION_LABEL).map(([k, v]) => [v, k]),
) as Record<string, ProducerPosition>;

export const prismaShiftRepository: ShiftRepository = {
  async listInRange(from, to) {
    const rows = await prisma.shift.findMany({
      where: { date: { gte: fromIsoDate(from), lte: fromIsoDate(to) } },
      include: { producer: { select: { name: true, position: true, squad: true } } },
      orderBy: [{ date: "asc" }, { shiftStart: "asc" }],
    });
    return rows.map((s) => ({
      producerId: s.producerId,
      producerName: s.producer.name,
      position: POSITION_LABEL[s.producer.position],
      squad: s.producer.squad,
      date: toIsoDate(s.date),
      kind: s.kind.toLowerCase() as ShiftKind,
      code: s.code,
      shiftStart: s.shiftStart,
      shiftEnd: s.shiftEnd,
    }));
  },

  async replace(from, to, producerIds, entries) {
    await prisma.$transaction([
      prisma.shift.deleteMany({
        where: {
          producerId: { in: producerIds },
          date: { gte: fromIsoDate(from), lte: fromIsoDate(to) },
        },
      }),
      prisma.shift.createMany({
        data: entries.map((e) => ({
          producerId: e.producerId,
          date: fromIsoDate(e.date),
          kind: e.kind.toUpperCase() as DbShiftKind,
          code: e.code,
          shiftStart: e.shiftStart,
          shiftEnd: e.shiftEnd,
        })),
      }),
    ]);
  },
};

function toProducer(p: {
  id: string;
  name: string;
  position: ProducerPosition;
  employeeId: string | null;
  squad: string;
}): Producer {
  return { id: p.id, name: p.name, position: POSITION_LABEL[p.position], employeeId: p.employeeId, squad: p.squad };
}

export const prismaProducerRepository: ProducerRepository = {
  async listAll() {
    const rows = await prisma.producer.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
    return rows.map(toProducer);
  },
  async create(input) {
    const row = await prisma.producer.create({
      data: { ...input, position: POSITION_ENUM[input.position] ?? "JR_PRODUCER" },
    });
    return toProducer(row);
  },
  async update(id, input) {
    const row = await prisma.producer.update({
      where: { id },
      data: { ...input, position: POSITION_ENUM[input.position] ?? "JR_PRODUCER" },
    });
    return toProducer(row);
  },
  async remove(id) {
    await prisma.$transaction([
      prisma.shift.deleteMany({ where: { producerId: id } }),
      prisma.producer.delete({ where: { id } }),
    ]);
  },
  slotCount(id) {
    return prisma.slot.count({ where: { OR: [{ producerId: id }, { admin1Id: id }, { admin2Id: id }] } });
  },
};
