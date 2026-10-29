import type {
  BookingWindowRepository,
  BrandRepository,
  RoomRepository,
} from "@/application/ports";
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
};

const BUILDING_LABEL = { RIPPLES_STUDIO: "Ripples Studio", WITREE: "Witree" } as const;
const SIZE_LABEL = { LARGE: "Large", SMALL: "Small" } as const;

export const prismaRoomRepository: RoomRepository = {
  async listAll() {
    const rooms = await prisma.room.findMany({ orderBy: { sortOrder: "asc" } });
    return rooms.map((r) => ({
      id: r.id,
      shortName: r.shortName,
      building: BUILDING_LABEL[r.building],
      floor: r.floor,
      size: SIZE_LABEL[r.size],
    }));
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
