import type { Mc as DbMc } from "@prisma/client";
import type { Room as DbRoom } from "@prisma/client";
import type {
  BookingWindowRepository,
  BrandRepository,
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
  async remove(id) {
    await prisma.$transaction([
      prisma.slotLock.deleteMany({ where: { brandId: id } }),
      prisma.brand.delete({ where: { id } }),
    ]);
  },
  slotCount(id) {
    return prisma.slot.count({ where: { brandId: id } });
  },
};

const BUILDING_LABEL = { RIPPLES_STUDIO: "Ripples Studio", WITREE: "Witree" } as const;
const SIZE_LABEL = { LARGE: "Large", SMALL: "Small" } as const;

const BUILDING_ENUM = { "Ripples Studio": "RIPPLES_STUDIO", Witree: "WITREE" } as const;
const SIZE_ENUM = { Large: "LARGE", Small: "SMALL" } as const;

function toRoom(r: DbRoom): Room {
  return {
    id: r.id,
    shortName: r.shortName,
    building: BUILDING_LABEL[r.building],
    floor: r.floor,
    size: SIZE_LABEL[r.size],
    roomNo: r.roomNo,
    brandAssignment: r.brandAssignment,
  };
}

function roomData(input: RoomInput) {
  return {
    building: BUILDING_ENUM[input.building as keyof typeof BUILDING_ENUM] ?? "RIPPLES_STUDIO",
    floor: input.floor,
    roomNo: input.roomNo,
    size: SIZE_ENUM[input.size as keyof typeof SIZE_ENUM] ?? "SMALL",
    brandAssignment: input.brandAssignment,
    shortName: input.roomNo + (input.brandAssignment ? ` (${input.brandAssignment})` : ""),
  };
}

export const prismaRoomRepository: RoomRepository = {
  async listAll() {
    const rooms = await prisma.room.findMany({ orderBy: { sortOrder: "asc" } });
    return rooms.map(toRoom);
  },
  async create(input) {
    const last = await prisma.room.aggregate({ _max: { sortOrder: true } });
    return toRoom(await prisma.room.create({ data: { ...roomData(input), sortOrder: (last._max.sortOrder ?? 0) + 1 } }));
  },
  async update(id, input) {
    return toRoom(await prisma.room.update({ where: { id }, data: roomData(input) }));
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
