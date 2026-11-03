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
  deleteBuilding,
  deleteRoom,
  saveBuilding,
  saveRoom,
  setBrandLock,
  editChannel,
} from "@/application/catalog/manage";
import * as bulk from "@/application/catalog/bulk";
import { approvePlan, confirmReady, getBrandCheckPage, setPlan } from "@/application/brand-check/brand-check";
import { getInputPage } from "@/application/slots/get-input-page";
import { advancePayment } from "@/application/payments/approve-payment";
import { getPaymentPage, type PaymentTab } from "@/application/payments/get-payment-page";
import { recordOnTime, recordPayment, type RecordInput } from "@/application/payments/record-payment";
import type { Clock, ProducerInput, RoomInput, SlotStaff } from "@/application/ports";
import { importProducers, previewProducerImport } from "@/application/shifts/import-producers";
import { importShifts, previewShiftImport } from "@/application/shifts/import-shifts";
import { closePdTime, reopenPdTime, type BlockInput } from "@/application/shifts/pd-blocks";
import { getShiftMonth, setShiftMonthConfirmed } from "@/application/shifts/shift-month";
import { saveProducer } from "@/application/shifts/producers";
import { assignStaff, getStaffGrid, getStaffShiftPage } from "@/application/shifts/staff-shift";
import { assignMc, getBusyMcs } from "@/application/slots/assign-mc";
import { checkRoomAvailability } from "@/application/slots/check-room";
import { deleteSlot } from "@/application/slots/delete-slot";
import { getTodayAlerts } from "@/application/slots/get-alerts";
import { getBrandSlotPage, type BrandSlotPageQuery } from "@/application/slots/get-brand-slot-page";
import { getMcPlanningPage } from "@/application/slots/get-mc-planning-page";
import { getMcSheetPage } from "@/application/slots/get-mc-sheet-page";
import { joinSlot } from "@/application/slots/join-slot";
import { respondToSlot, type McResponse } from "@/application/slots/mc-respond";
import { sendToMcs } from "@/application/slots/send-to-mcs";
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
  prismaBrandPlanRepository,
  prismaBuildingRepository,
} from "@/infrastructure/repositories/prisma-catalog-repositories";
import {
  prismaProducerRepository,
  prismaPdBlockRepository,
  prismaShiftMonthRepository,
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
  buildings: prismaBuildingRepository,
  mcs: prismaMcRepository,
  bookingWindows: prismaBookingWindowRepository,
  payments: prismaPaymentRepository,
  shifts: prismaShiftRepository,
  producers: prismaProducerRepository,
  locks: prismaSlotLockRepository,
  shiftMonths: prismaShiftMonthRepository,
  pdBlocks: prismaPdBlockRepository,
  plans: prismaBrandPlanRepository,
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
      team?: string | null;
      squad?: string | null;
      producerId?: string | null;
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
  getShiftMonth: (month: string) => getShiftMonth(deps, month),
  closePdTime: (user: SessionUser, input: BlockInput) => closePdTime(deps, user, input),
  reopenPdTime: (user: SessionUser, ids: string[]) => reopenPdTime(deps, user, ids),
  previewProducerImport: (user: SessionUser, rows: unknown[][]) => previewProducerImport(deps, user, rows),
  importProducers: (user: SessionUser, rows: unknown[][]) => importProducers(deps, user, rows),
  setShiftMonthConfirmed: (user: SessionUser, month: string, confirmed: boolean) =>
    setShiftMonthConfirmed(deps, user, month, confirmed),
  listProducers: () => deps.producers.listAll(),
  saveProducer: (user: SessionUser, input: ProducerInput, id?: string) =>
    saveProducer(deps, user, input, id),
  getInputPage: (user: SessionUser, date: string | null) => getInputPage(deps, user, date),
  getMcSheetPage: (user: SessionUser, month: string) => getMcSheetPage(deps, user, month),
  joinSlot: (user: SessionUser, slotId: string, producerId: string) => joinSlot(deps, user, slotId, producerId),
  respondToSlot: (user: SessionUser, slotId: string, response: McResponse) =>
    respondToSlot(deps, user, slotId, response),
  sendToMcs: (user: SessionUser, month: string, slotIds: string[]) => sendToMcs(deps, user, month, slotIds),
  getBrandCheckPage: (user: SessionUser, month: string) => getBrandCheckPage(deps, user, month),
  setPlan: (user: SessionUser, brandId: string, month: string, hours: number, remark: string) =>
    setPlan(deps, user, brandId, month, hours, remark),
  approvePlan: (user: SessionUser, brandId: string, month: string, approve: boolean) =>
    approvePlan(deps, user, brandId, month, approve),
  confirmReady: (user: SessionUser, month: string) => confirmReady(deps, user, month),
  listRooms: () => deps.rooms.listAll(),
  listBuildings: () => deps.buildings.listAll(),
  saveBuilding: (user: SessionUser, input: { name: string; code: string }, id?: string) =>
    saveBuilding(deps, user, input, id),
  deleteBuilding: (user: SessionUser, id: string) => deleteBuilding(deps, user, id),
  listBrands: () => deps.brands.listAll(),
  saveRoom: (user: SessionUser, input: RoomInput, id?: string) => saveRoom(deps, user, input, id),
  deleteRoom: (user: SessionUser, id: string) => deleteRoom(deps, user, id),
  addChannel: (user: SessionUser, brandName: string, platform: string) =>
    addChannel(deps, user, brandName, platform),
  deleteChannel: (user: SessionUser, id: string) => deleteChannel(deps, user, id),
  editChannel: (user: SessionUser, id: string, brandName: string, platform: string) =>
    editChannel(deps, user, id, brandName, platform),
  updateProducers: (user: SessionUser, ids: string[], patch: bulk.ProducerPatch) => bulk.updateProducers(deps, user, ids, patch),
  deleteProducers: (user: SessionUser, ids: string[]) => bulk.deleteProducers(deps, user, ids),
  updateRooms: (user: SessionUser, ids: string[], patch: bulk.RoomPatch) => bulk.updateRooms(deps, user, ids, patch),
  deleteRooms: (user: SessionUser, ids: string[]) => bulk.deleteRooms(deps, user, ids),
  updateChannels: (user: SessionUser, ids: string[], patch: bulk.ChannelPatch) => bulk.updateChannels(deps, user, ids, patch),
  deleteChannels: (user: SessionUser, ids: string[]) => bulk.deleteChannels(deps, user, ids),
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
