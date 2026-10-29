import type {
  ApprovalStatus as DbApprovalStatus,
  LateReason as DbLateReason,
  Prisma,
  SlotStatus as DbSlotStatus,
} from "@prisma/client";
import type {
  ApprovalStatus,
  Payment,
  PaymentRepository,
  PaymentRow,
} from "@/application/ports";
import type { LateReason, RateType } from "@/domain/payment";
import type { SlotStatus } from "@/domain/slot-rules";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { prisma } from "../prisma";

const MC_STATUS_LABEL = {
  FULL_TIME: "Full-Time",
  EXCLUSIVE: "Exclusive",
  FREELANCE: "Freelance",
  TRAINEE: "Trainee",
} as const;

const rowSelect = {
  id: true,
  date: true,
  startMinute: true,
  endMinute: true,
  status: true,
  brand: { select: { brandName: true, platform: true } },
  room: { select: { shortName: true } },
  mc: { select: { nickname: true, status: true, rateType: true, rate: true } },
  payment: {
    include: { recordedBy: { select: { name: true } }, approvedBy: { select: { name: true } } },
  },
} satisfies Prisma.SlotSelect;

type Row = Prisma.SlotGetPayload<{ select: typeof rowSelect }>;

function toRow(r: Row): PaymentRow {
  const p = r.payment;
  const payment: Payment | null = p && {
    id: p.id,
    slotId: p.slotId,
    actualStart: p.actualStart,
    actualEnd: p.actualEnd,
    lateReason: p.lateReason.toLowerCase() as LateReason,
    note: p.note,
    basePay: p.basePay,
    deduction: p.deduction,
    otPay: p.otPay,
    finalPay: p.finalPay,
    approvalStatus: p.approvalStatus.toLowerCase() as ApprovalStatus,
    recordedByName: p.recordedBy.name,
    approvedByName: p.approvedBy?.name ?? null,
  };
  return {
    slotId: r.id,
    date: toIsoDate(r.date),
    startMinute: r.startMinute,
    endMinute: r.endMinute,
    brandName: r.brand.brandName,
    platform: r.brand.platform,
    roomName: r.room.shortName,
    // listRows/findRow only return slots that have an MC.
    mc: {
      nickname: r.mc!.nickname,
      status: MC_STATUS_LABEL[r.mc!.status],
      rateType: r.mc!.rateType.toLowerCase() as RateType,
      rate: r.mc!.rate,
    },
    slotStatus: r.status.toLowerCase() as SlotStatus,
    payment,
  };
}

function inRange(from: string, to: string): Prisma.SlotWhereInput {
  return { date: { gte: fromIsoDate(from), lte: fromIsoDate(to) } };
}

// Confirmed slots with an MC, not yet recorded, whose scheduled end has passed.
function toRecordWhere(endedBefore: { date: string; minute: number }): Prisma.SlotWhereInput {
  const today = fromIsoDate(endedBefore.date);
  return {
    status: "CONFIRMED",
    mcId: { not: null },
    payment: { is: null },
    OR: [{ date: { lt: today } }, { date: today, endMinute: { lte: endedBefore.minute } }],
  };
}

const toDbApproval = (s: ApprovalStatus) => s.toUpperCase() as DbApprovalStatus;

export const prismaPaymentRepository: PaymentRepository = {
  async listRows({ from, to, endedBefore, tab, limit }) {
    let where: Prisma.SlotWhereInput;
    if (tab === "toRecord") where = toRecordWhere(endedBefore);
    else if (tab === "all") where = { OR: [toRecordWhere(endedBefore), { payment: { isNot: null } }] };
    else where = { payment: { is: { approvalStatus: toDbApproval(tab) } } };

    const rows = await prisma.slot.findMany({
      where: { AND: [inRange(from, to), where] },
      select: rowSelect,
      orderBy: [{ date: "asc" }, { startMinute: "asc" }, { room: { sortOrder: "asc" } }],
      take: limit,
    });
    return rows.map(toRow);
  },

  async summary(from, to, endedBefore) {
    const [toRecord, groups] = await Promise.all([
      prisma.slot.count({ where: { AND: [inRange(from, to), toRecordWhere(endedBefore)] } }),
      prisma.payment.groupBy({
        by: ["approvalStatus"],
        where: { slot: inRange(from, to) },
        _count: true,
        _sum: { finalPay: true, otPay: true },
      }),
    ]);
    const get = (s: DbApprovalStatus) => {
      const g = groups.find((x) => x.approvalStatus === s);
      return { count: g?._count ?? 0, total: g?._sum.finalPay ?? 0 };
    };
    return {
      toRecord,
      pending: get("PENDING"),
      approved: get("APPROVED"),
      locked: get("LOCKED"),
      otTotal: groups.reduce((sum, g) => sum + (g._sum.otPay ?? 0), 0),
    };
  },

  async findRow(slotId) {
    const row = await prisma.slot.findFirst({
      where: { id: slotId, mcId: { not: null } },
      select: rowSelect,
    });
    return row ? toRow(row) : null;
  },

  async findById(paymentId) {
    const p = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { slot: { select: rowSelect } },
    });
    if (!p || !p.slot.mc) return null;
    const row = toRow(p.slot);
    return { ...row.payment!, row };
  },

  record(slotId, amounts, recordedById) {
    return prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUniqueOrThrow({ where: { id: slotId }, select: { date: true } });
      // Same per-day lock as slot booking, so a booking change can't
      // overwrite the completed status while we set it.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"slots:" + toIsoDate(slot.date)}))`;

      const data = {
        ...amounts,
        lateReason: amounts.lateReason.toUpperCase() as DbLateReason,
        recordedById,
      };
      const existing = await tx.payment.findUnique({ where: { slotId } });
      if (existing) {
        const { count } = await tx.payment.updateMany({
          where: { slotId, approvalStatus: "PENDING" },
          data,
        });
        if (count === 0) return false;
      } else {
        await tx.payment.create({ data: { ...data, slotId } });
      }
      await tx.slot.update({ where: { id: slotId }, data: { status: "COMPLETED" as DbSlotStatus } });
      return true;
    });
  },

  async advance(paymentId, from, to, byUserId) {
    const { count } = await prisma.payment.updateMany({
      where: { id: paymentId, approvalStatus: toDbApproval(from) },
      data: {
        approvalStatus: toDbApproval(to),
        ...(to === "approved" ? { approvedById: byUserId, approvedAt: new Date() } : {}),
      },
    });
    return count === 1;
  },
};
