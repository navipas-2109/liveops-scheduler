// Wires use cases to their real implementations. Pages and server actions
// call these instead of reaching into infrastructure directly.

import "server-only";
import type { SessionUser } from "@/application/auth/login";
import { login } from "@/application/auth/login";
import { saveBookingWindow } from "@/application/booking-windows/save-booking-window";
import type { Clock } from "@/application/ports";
import { checkRoomAvailability } from "@/application/slots/check-room";
import { deleteSlot } from "@/application/slots/delete-slot";
import { getTodayAlerts } from "@/application/slots/get-alerts";
import { getBrandSlotPage, type BrandSlotPageQuery } from "@/application/slots/get-brand-slot-page";
import { saveSlot, type SlotInput } from "@/application/slots/save-slot";
import type { BookingWindow } from "@/domain/booking";
import { currentLiveDate, toIsoDate } from "@/domain/time";
import { bcryptHasher } from "@/infrastructure/auth/bcrypt-hasher";
import { larkNotifier } from "@/infrastructure/lark-notifier";
import {
  prismaBookingWindowRepository,
  prismaBrandRepository,
  prismaRoomRepository,
} from "@/infrastructure/repositories/prisma-catalog-repositories";
import { prismaSlotRepository } from "@/infrastructure/repositories/prisma-slot-repository";
import { prismaUserRepository } from "@/infrastructure/repositories/prisma-user-repository";

const clock: Clock = { today: () => toIsoDate(currentLiveDate()) };

const deps = {
  users: prismaUserRepository,
  slots: prismaSlotRepository,
  brands: prismaBrandRepository,
  rooms: prismaRoomRepository,
  bookingWindows: prismaBookingWindowRepository,
  passwords: bcryptHasher,
  notifier: larkNotifier,
  clock,
};

export const services = {
  today: () => clock.today(),
  login: (email: string, password: string) => login(deps, email, password),
  getTodayAlerts: () => getTodayAlerts(deps),
  getBrandSlotPage: (user: SessionUser, query: BrandSlotPageQuery) =>
    getBrandSlotPage(deps, user, query),
  saveSlot: (user: SessionUser, input: SlotInput, slotId?: string) =>
    saveSlot(deps, user, input, slotId),
  deleteSlot: (user: SessionUser, slotId: string) => deleteSlot(deps, user, slotId),
  checkRoomAvailability: (query: Parameters<typeof checkRoomAvailability>[1]) =>
    checkRoomAvailability(deps, query),
  saveBookingWindow: (user: SessionUser, window: BookingWindow) =>
    saveBookingWindow(deps, user, window),
};
