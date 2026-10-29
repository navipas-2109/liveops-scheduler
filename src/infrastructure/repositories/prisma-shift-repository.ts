import type { ShiftRepository } from "@/application/ports";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { prisma } from "../prisma";

const POSITION_LABEL = {
  TEAM_LEAD: "Producer Team Lead",
  SENIOR: "Senior Producer",
  PRODUCER: "Producer",
  JR_PRODUCER: "Jr. Producer",
} as const;

export const prismaShiftRepository: ShiftRepository = {
  async listInRange(from, to) {
    const rows = await prisma.shift.findMany({
      where: { date: { gte: fromIsoDate(from), lte: fromIsoDate(to) } },
      include: { producer: { select: { name: true, position: true } } },
      orderBy: [{ date: "asc" }, { shiftStart: "asc" }],
    });
    return rows.map((s) => ({
      producerId: s.producerId,
      producerName: s.producer.name,
      position: POSITION_LABEL[s.producer.position],
      date: toIsoDate(s.date),
      shiftStart: s.shiftStart,
      shiftEnd: s.shiftEnd,
    }));
  },
};
