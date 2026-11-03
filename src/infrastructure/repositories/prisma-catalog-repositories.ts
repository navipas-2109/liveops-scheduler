import type { Mc as DbMc } from "@prisma/client";
import type { Room as DbRoom } from "@prisma/client";
import type {
  BookingWindowRepository,
  BrandPlan,
  BrandPlanRepository,
  BrandRepository,
  BuildingRepository,
  Mc,
  McRepository,
  Room,
  RoomInput,
  RoomRepository,
  SlotLockRepository,
} from "@/application/ports";
import type { RateType } from "@/domain/payment";
import { fromIsoDate, toIsoDate } from "@/domain/time";
import { prisma } from "../prisma";

const brandOrder = [{ brandName: "asc" as const }, { platform: "asc" as const }];

export const prismaBrandRepository: BrandRepository = {
  listAll() {
    return prisma.brand.findMany({ orderBy: brandOrder });
  },
  listForAe(userId) {
    return prisma.brand.findMany({ where: { aes: { some: { id: userId } } }, orderBy: brandOrder });
  },
  create(brandName, platform) {
    return prisma.brand.create({ data: { brandName, platform } });
  },
  async update(id, brandName, platform) {
    await prisma.brand.update({ where: { id }, data: { brandName, platform } });
  },
  async remove(id) {
    await prisma.$transaction([
      prisma.slotLock.deleteMany({ where: { brandId: id } }),
      prisma.brandPlan.deleteMany({ where: { brandId: id } }),
      prisma.brand.delete({ where: { id } }),
    ]);
  },
  slotCount(id) {
    return prisma.slot.count({ where: { brandId: id } });
  },
};

const SIZE_LABEL = { LARGE: "Large", SMALL: "Small" } as const;
const SIZE_ENUM = { Large: "LARGE", Small: "SMALL" } as const;

function toRoom(r: DbRoom & { building: { name: string; code: string } }): Room {
  return {
    id: r.id,
    shortName: r.shortName,
    buildingId: r.buildingId,
    building: r.building.name,
    buildingCode: r.building.code,
    floor: r.floor,
    size: SIZE_LABEL[r.size],
    roomNo: r.roomNo,
    brandAssignment: r.brandAssignment,
  };
}

function roomData(input: RoomInput) {
  return {
    buildingId: input.buildingId,
    floor: input.floor,
    roomNo: input.roomNo,
    size: SIZE_ENUM[input.size as keyof typeof SIZE_ENUM] ?? "SMALL",
    brandAssignment: input.brandAssignment,
    shortName: input.roomNo + (input.brandAssignment ? ` (${input.brandAssignment})` : ""),
  };
}

const withBuilding = { building: { select: { name: true, code: true } } } as const;

export const prismaBuildingRepository: BuildingRepository = {
  async listAll() {
    const rows = await prisma.building.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { rooms: true } } } });
    return rows.map((b) => ({ id: b.id, name: b.name, code: b.code, roomCount: b._count.rooms }));
  },
  async create(name, code) {
    const last = await prisma.building.aggregate({ _max: { sortOrder: true } });
    await prisma.building.create({ data: { name, code, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  },
  async update(id, name, code) {
    await prisma.building.update({ where: { id }, data: { name, code } });
  },
  async remove(id) {
    await prisma.building.delete({ where: { id } });
  },
};

export const prismaRoomRepository: RoomRepository = {
  async listAll() {
    const rooms = await prisma.room.findMany({ orderBy: { sortOrder: "asc" }, include: withBuilding });
    return rooms.map(toRoom);
  },
  async create(input) {
    const last = await prisma.room.aggregate({ _max: { sortOrder: true } });
    return toRoom(
      await prisma.room.create({
        data: { ...roomData(input), sortOrder: (last._max.sortOrder ?? 0) + 1 },
        include: withBuilding,
      }),
    );
  },
  async update(id, input) {
    return toRoom(await prisma.room.update({ where: { id }, data: roomData(input), include: withBuilding }));
  },
  async remove(id) {
    await prisma.room.delete({ where: { id } });
  },
  slotCount(id) {
    return prisma.slot.count({ where: { roomId: id } });
  },
};

export const prismaSlotLockRepository: SlotLockRepository = {
  async listForMonth(month) {
    const rows = await prisma.slotLock.findMany({ where: { month }, include: { lockedBy: { select: { name: true } } } });
    return rows.map((l) => ({
      brandId: l.brandId,
      month: l.month,
      lockedByName: l.lockedBy.name,
      lockedAt: l.lockedAt.toISOString(),
    }));
  },
  async isLocked(brandId, month) {
    return (await prisma.slotLock.count({ where: { brandId, month } })) > 0;
  },
  async lock(brandId, month, userId) {
    await prisma.slotLock.upsert({
      where: { brandId_month: { brandId, month } },
      create: { brandId, month, lockedById: userId },
      update: {},
    });
  },
  async unlock(brandId, month) {
    await prisma.slotLock.deleteMany({ where: { brandId, month } });
  },
};

export const prismaBrandPlanRepository: BrandPlanRepository = {
  async listForMonth(month) {
    const rows = await prisma.brandPlan.findMany({ where: { month }, include: { approvedBy: { select: { name: true } } } });
    return rows.map(toPlan);
  },
  async find(brandId, month) {
    const row = await prisma.brandPlan.findUnique({
      where: { brandId_month: { brandId, month } },
      include: { approvedBy: { select: { name: true } } },
    });
    return row ? toPlan(row) : null;
  },
  async setPlan(brandId, month, planMinutes, remark) {
    const current = await prisma.brandPlan.findUnique({ where: { brandId_month: { brandId, month } } });
    const keepApproval = current?.planMinutes === planMinutes;
    await prisma.brandPlan.upsert({
      where: { brandId_month: { brandId, month } },
      create: { brandId, month, planMinutes, remark },
      update: { planMinutes, remark, ...(keepApproval ? {} : { approvedById: null, approvedAt: null }) },
    });
  },
  async setApproved(brandId, month, userId) {
    await prisma.brandPlan.updateMany({
      where: { brandId, month },
      data: { approvedById: userId, approvedAt: userId ? new Date() : null },
    });
  },
};

function toPlan(p: {
  brandId: string;
  month: string;
  planMinutes: number;
  remark: string;
  approvedAt: Date | null;
  approvedBy: { name: string } | null;
}): BrandPlan {
  return {
    brandId: p.brandId,
    month: p.month,
    planMinutes: p.planMinutes,
    remark: p.remark,
    approvedByName: p.approvedBy?.name ?? null,
    approvedAt: p.approvedAt?.toISOString() ?? null,
  };
}

export const prismaBookingWindowRepository: BookingWindowRepository = {
  async listAll() {
    const rows = await prisma.bookingWindow.findMany({ orderBy: { targetMonth: "asc" } });
    return rows.map((w) => ({
      targetMonth: w.targetMonth,
      openFrom: toIsoDate(w.openFrom),
      openTo: toIsoDate(w.openTo),
      note: w.note,
    }));
  },
  async save(window, createdById) {
    const data = {
      openFrom: fromIsoDate(window.openFrom),
      openTo: fromIsoDate(window.openTo),
      note: window.note,
    };
    await prisma.bookingWindow.upsert({
      where: { targetMonth: window.targetMonth },
      create: { targetMonth: window.targetMonth, createdById, ...data },
      update: data,
    });
  },
};

const MC_STATUS_LABEL = {
  FULL_TIME: "Full-Time",
  EXCLUSIVE: "Exclusive",
  FREELANCE: "Freelance",
  TRAINEE: "Trainee",
} as const;

function toMc(m: DbMc): Mc {
  return {
    id: m.id,
    nickname: m.nickname,
    fullName: m.fullName,
    status: MC_STATUS_LABEL[m.status],
    rateType: m.rateType.toLowerCase() as RateType,
    rate: m.rate,
  };
}

export const prismaMcRepository: McRepository = {
  async listAll() {
    const mcs = await prisma.mc.findMany({ orderBy: [{ status: "asc" }, { nickname: "asc" }] });
    return mcs.map(toMc);
  },
  async findById(id) {
    const mc = await prisma.mc.findUnique({ where: { id } });
    return mc ? toMc(mc) : null;
  },
};
