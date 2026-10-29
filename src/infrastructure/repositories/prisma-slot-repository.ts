import type { SlotRepository } from "@/application/ports";
import { prisma } from "../prisma";

export const prismaSlotRepository: SlotRepository = {
  async countAlertsOn(date) {
    const groups = await prisma.slot.groupBy({
      by: ["status"],
      where: { date, status: { in: ["CONFLICT", "WAITING"] } },
      _count: true,
    });
    const count = (status: string) => groups.find((g) => g.status === status)?._count ?? 0;
    return { conflict: count("CONFLICT"), waiting: count("WAITING") };
  },
};
