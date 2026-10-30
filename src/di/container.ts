// Wires use cases to their real implementations. Pages and server actions
// call these instead of reaching into infrastructure directly.

import "server-only";
import type { SessionUser } from "@/application/auth/login";
import { login } from "@/application/auth/login";
import { saveBookingWindow } from "@/application/booking-windows/save-booking-window";
import {
  addChannel,
  deleteChannel,
  deleteProducer,
  deleteRoom,
  saveRoom,
  setBrandLock,
} from "@/application/catalog/manage";
import { getInputPage } from "@/application/slots/get-input-page";
import { advancePayment } from "@/application/payments/approve-payment";
import { getPaymentPage, type PaymentTab } from "@/application/payments/get-payment-page";
import { recordOnTime, recordPayment, type RecordInput } from "@/application/payments/record-payment";
import type { Clock, ProducerInput, RoomInput, SlotStaff } from "@/application/ports";
import { importShifts, previewShiftImport } from "@/application/shifts/import-shifts";
import { saveProducer } from "@/application/shifts/producers";
import { assignStaff, getStaffGrid, getStaffShiftPage } from "@/application/shifts/staff-shift";
import { assignMc, getBusyMcs } from "@/application/slots/assign-mc";
import { checkRoomAvailability } from "@/application/slots/check-room";
import { deleteSlot } from "@/application/slots/delete-slot";
import { getTodayAlerts } from "@/application/slots/get-alerts";
import { getBrandSlotPage, type BrandSlotPageQuery } from "@/application/slots/get-brand-slot-page";
import { getMcPlanningPage } from "@/application/slots/get-mc-planning-page";
import {
  getSchedulePage,
  rangeFor,
  type DayGrouping,
  type ScheduleView,
} from "@/application/slots/get-schedule-page";
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
  prismaSlotLockRepository,
} from "@/infrastructure/repositories/prisma-catalog-repositories";
import {
  prismaProducerRepository,
  prismaShiftRepository,
} from "@/infrastructure/repositories/prisma-shift-repository";
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
  shifts: prismaShiftRepository,
  producers: prismaProducerRepository,
  locks: prismaSlotLockRepository,
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
  getSchedulePage: (
    user: SessionUser,
    query: {
      view: ScheduleView;
      date: string | null;
      roomId: string | null;
      grouping: DayGrouping;
      brandName?: string | null;
      platform?: string | null;
    },
  ) => getSchedulePage(deps, user, query),
  getMcPlanningPage: (
    user: SessionUser,
    query: { month: string; day: string | null; status: SlotStatus | null },
  ) => getMcPlanningPage(deps, user, query),
  getBusyMcs: (slotId: string) => getBusyMcs(deps, slotId),
  assignMc: (user: SessionUser, slotId: string, mcId: string | null) =>
    assignMc(deps, user, slotId, mcId),
  getStaffShiftPage: (user: SessionUser, date: string | null) => getStaffShiftPage(deps, user, date),
  getStaffGrid: (user: SessionUser, view: "week" | "month", date: string | null) =>
    getStaffGrid(deps, user, { view, date, ...rangeFor(view, date ?? clock.today()) }),
  assignStaff: (user: SessionUser, slotId: string, staff: SlotStaff) =>
    assignStaff(deps, user, slotId, staff),
  previewShiftImport: (user: SessionUser, input: { month: string; text: string }) =>
    previewShiftImport(deps, user, input),
  importShifts: (user: SessionUser, input: { month: string; text: string }) =>
    importShifts(deps, user, input),
  listProducers: () => deps.producers.listAll(),
  saveProducer: (user: SessionUser, input: ProducerInput, id?: string) =>
    saveProducer(deps, user, input, id),
  getInputPage: (user: SessionUser, date: string | null) => getInputPage(deps, user, date),
  listRooms: () => deps.rooms.listAll(),
  listBrands: () => deps.brands.listAll(),
  saveRoom: (user: SessionUser, input: RoomInput, id?: string) => saveRoom(deps, user, input, id),
  deleteRoom: (user: SessionUser, id: string) => deleteRoom(deps, user, id),
  addChannel: (user: SessionUser, brandName: string, platform: string) =>
    addChannel(deps, user, brandName, platform),
  deleteChannel: (user: SessionUser, id: string) => deleteChannel(deps, user, id),
  deleteProducer: (user: SessionUser, id: string) => deleteProducer(deps, user, id),
  setBrandLock: (user: SessionUser, brandId: string, month: string, locked: boolean) =>
    setBrandLock(deps, user, brandId, month, locked),
  getPaymentPage: (user: SessionUser, query: { month: string; tab: PaymentTab }) =>
    getPaymentPage(deps, user, query),
  recordPayment: (user: SessionUser, input: RecordInput) => recordPayment(deps, user, input),
  recordOnTime: (user: SessionUser, slotId: string) => recordOnTime(deps, user, slotId),
  advancePayment: (user: SessionUser, paymentId: string, to: "approved" | "locked") =>
    advancePayment(deps, user, paymentId, to),
};
