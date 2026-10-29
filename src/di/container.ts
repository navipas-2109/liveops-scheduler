// Wires use cases to their real implementations. Pages and server actions
// call these instead of reaching into infrastructure directly.

import "server-only";
import type { SessionUser } from "@/application/auth/login";
import { login } from "@/application/auth/login";
import { saveBookingWindow } from "@/application/booking-windows/save-booking-window";
import { advancePayment } from "@/application/payments/approve-payment";
import { getPaymentPage, type PaymentTab } from "@/application/payments/get-payment-page";
import { recordOnTime, recordPayment, type RecordInput } from "@/application/payments/record-payment";
import type { Clock } from "@/application/ports";
import { assignMc, getBusyMcs } from "@/application/slots/assign-mc";
import { checkRoomAvailability } from "@/application/slots/check-room";
import { deleteSlot } from "@/application/slots/delete-slot";
import { getTodayAlerts } from "@/application/slots/get-alerts";
import { getBrandSlotPage, type BrandSlotPageQuery } from "@/application/slots/get-brand-slot-page";
import { getMcPlanningPage } from "@/application/slots/get-mc-planning-page";
import { saveSlot, type SlotInput } from "@/application/slots/save-slot";
import type { BookingWindow } from "@/domain/booking";
import type { SlotStatus } from "@/domain/slot-rules";
import { currentLiveDate, currentLiveMinute, toIsoDate } from "@/domain/time";
import { bcryptHasher } from "@/infrastructure/auth/bcrypt-hasher";
import { larkNotifier } from "@/infrastructure/lark-notifier";
import {
  prismaBookingWindowRepository,
  prismaBrandRepository,
  prismaMcRepository,
  prismaRoomRepository,
} from "@/infrastructure/repositories/prisma-catalog-repositories";
import { prismaPaymentRepository } from "@/infrastructure/repositories/prisma-payment-repository";
import { prismaSlotRepository } from "@/infrastructure/repositories/prisma-slot-repository";
import { prismaUserRepository } from "@/infrastructure/repositories/prisma-user-repository";

const clock: Clock = {
  today: () => toIsoDate(currentLiveDate()),
  nowMinute: () => currentLiveMinute(),
};

const deps = {
  users: prismaUserRepository,
  slots: prismaSlotRepository,
  brands: prismaBrandRepository,
  rooms: prismaRoomRepository,
  mcs: prismaMcRepository,
  bookingWindows: prismaBookingWindowRepository,
  payments: prismaPaymentRepository,
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
  getMcPlanningPage: (
    user: SessionUser,
    query: { month: string; day: string | null; status: SlotStatus | null },
  ) => getMcPlanningPage(deps, user, query),
  getBusyMcs: (slotId: string) => getBusyMcs(deps, slotId),
  assignMc: (user: SessionUser, slotId: string, mcId: string | null) =>
    assignMc(deps, user, slotId, mcId),
  getPaymentPage: (user: SessionUser, query: { month: string; tab: PaymentTab }) =>
    getPaymentPage(deps, user, query),
  recordPayment: (user: SessionUser, input: RecordInput) => recordPayment(deps, user, input),
  recordOnTime: (user: SessionUser, slotId: string) => recordOnTime(deps, user, slotId),
  advancePayment: (user: SessionUser, paymentId: string, to: "approved" | "locked") =>
    advancePayment(deps, user, paymentId, to),
};
