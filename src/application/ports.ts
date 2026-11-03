// Interfaces the use cases depend on. Infrastructure provides the real ones;
// tests can pass simple fakes.

import type { BookingWindow } from "@/domain/booking";
import type { LateReason, RateType } from "@/domain/payment";
import type { ShiftKind } from "@/domain/shift-sheet";
import type { Role } from "@/domain/roles";
import type { SlotStatus } from "@/domain/slot-rules";

export interface UserCredentials {
  id: string;
  name: string;
  role: Role;
  mcId: string | null;
  producerId: string | null;
  passwordHash: string;
}

export interface UserRepository {
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
}

export interface PasswordHasher {
  verify(password: string, hash: string): Promise<boolean>;
}

export interface Brand {
  id: string;
  brandName: string;
  platform: string;
}

export interface BrandRepository {
  listAll(): Promise<Brand[]>;
  listForAe(userId: string): Promise<Brand[]>;
  create(brandName: string, platform: string): Promise<Brand>;
  update(id: string, brandName: string, platform: string): Promise<void>;
  remove(id: string): Promise<void>;
  slotCount(id: string): Promise<number>;
}

export interface SlotLock {
  brandId: string;
  month: string;
  lockedByName: string;
  lockedAt: string; // ISO timestamp
}

export interface SlotLockRepository {
  listForMonth(month: string): Promise<SlotLock[]>;
  isLocked(brandId: string, month: string): Promise<boolean>;
  lock(brandId: string, month: string, userId: string): Promise<void>;
  unlock(brandId: string, month: string): Promise<void>;
}

export interface BrandPlan {
  brandId: string;
  month: string;
  planMinutes: number;
  remark: string;
  approvedByName: string | null;
  approvedAt: string | null; // ISO timestamp
}

export interface BrandPlanRepository {
  listForMonth(month: string): Promise<BrandPlan[]>;
  find(brandId: string, month: string): Promise<BrandPlan | null>;
  // Changing the plan clears an approval.
  setPlan(brandId: string, month: string, planMinutes: number, remark: string): Promise<void>;
  setApproved(brandId: string, month: string, userId: string | null): Promise<void>;
}

// Time a Planner closed for a Producer (live-day minutes, like slots).
export interface PdBlock {
  id: string;
  producerId: string;
  producerName: string;
  date: string;
  startMinute: number;
  endMinute: number;
  note: string;
  createdByName: string;
}

export type NewPdBlock = Pick<PdBlock, "producerId" | "date" | "startMinute" | "endMinute" | "note">;

export interface PdBlockRepository {
  listInRange(from: string, to: string): Promise<PdBlock[]>;
  createMany(blocks: NewPdBlock[], userId: string): Promise<number>;
  remove(ids: string[]): Promise<void>;
}

export interface ShiftMonthInfo {
  month: string;
  confirmedByName: string;
  confirmedAt: string; // ISO timestamp
}

export interface ShiftMonthRepository {
  find(month: string): Promise<ShiftMonthInfo | null>;
  confirm(month: string, userId: string): Promise<void>;
  unconfirm(month: string): Promise<void>;
}

export interface Building {
  id: string;
  name: string;
  code: string; // short label, e.g. "RS"
  roomCount: number;
}

export interface BuildingRepository {
  listAll(): Promise<Building[]>;
  create(name: string, code: string): Promise<void>;
  update(id: string, name: string, code: string): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface Room {
  id: string;
  shortName: string;
  buildingId: string;
  building: string; // building name
  buildingCode: string;
  floor: number;
  size: string;
  roomNo: string;
  brandAssignment: string;
}

export interface RoomInput {
  buildingId: string;
  floor: number;
  roomNo: string;
  size: string; // "Large" | "Small"
  brandAssignment: string;
}

export interface Mc {
  id: string;
  nickname: string;
  fullName: string;
  status: string; // "Full-Time" | "Exclusive" | "Freelance" | "Trainee"
  rateType: RateType;
  rate: number;
}

export interface McRepository {
  listAll(): Promise<Mc[]>;
  findById(id: string): Promise<Mc | null>;
}

export interface RoomRepository {
  listAll(): Promise<Room[]>;
  create(input: RoomInput): Promise<Room>;
  update(id: string, input: RoomInput): Promise<Room>;
  remove(id: string): Promise<void>;
  slotCount(id: string): Promise<number>;
}

export interface BookingWindowRepository {
  listAll(): Promise<BookingWindow[]>;
  save(window: BookingWindow, createdById: string): Promise<void>;
}

// Dates are "YYYY-MM-DD"; times are live-day minutes (see domain/time.ts).
export interface SlotRecord {
  id: string;
  date: string;
  startMinute: number;
  endMinute: number;
  roomId: string;
  brandId: string;
  campaign: string;
  requirement: string;
  aeId: string;
  mcId: string | null;
  producerId: string | null;
  admin1Id: string | null;
  admin2Id: string | null;
  status: SlotStatus;
  mcSent: boolean; // the Planner sent this MC assignment to the MC
  mcConfirmed: boolean; // the MC ticked this live as confirmed
}

export interface SlotListItem extends SlotRecord {
  brandName: string;
  platform: string;
  roomName: string;
  aeName: string;
  mcName: string | null;
  plannerName: string | null;
  producerName: string | null;
  admin1Name: string | null;
  admin2Name: string | null;
}

export type NewSlot = Pick<
  SlotRecord,
  "date" | "startMinute" | "endMinute" | "roomId" | "brandId" | "campaign" | "requirement" | "aeId"
> & { producerId?: string | null; admin1Id?: string | null };

export type SlotChanges = Omit<NewSlot, "aeId">;

export interface SlotListFilter {
  from: string;
  to: string;
  aeId?: string;
  roomId?: string;
  brandName?: string;
  platform?: string;
  status?: SlotStatus;
  limit?: number;
}

export type StatusCounts = Partial<Record<SlotStatus, number>>;

export interface BrandStatusCounts {
  brandId: string;
  brandName: string;
  platform: string;
  counts: StatusCounts;
}

export interface SlotAlertCounts {
  conflict: number;
  waiting: number;
}

// Writes that must not interleave with another booking of the same day.
export interface SlotWriteSession {
  listOnDate(date: string): Promise<SlotRecord[]>;
  create(slot: NewSlot): Promise<SlotRecord>;
  update(id: string, changes: SlotChanges): Promise<SlotRecord>;
  remove(id: string): Promise<void>;
  setStatus(id: string, status: SlotStatus): Promise<void>;
  // Changing the MC clears "sent" and the MC's confirmation.
  setMc(id: string, mcId: string | null, plannerId: string): Promise<void>;
  markMcSent(id: string): Promise<void>;
  setMcConfirmed(id: string, confirmed: boolean): Promise<void>;
  clearMc(id: string): Promise<void>;
  setStaff(id: string, staff: SlotStaff): Promise<void>;
}

export interface SlotStaff {
  producerId: string | null;
  admin1Id: string | null;
  admin2Id: string | null;
}

export interface SlotRepository {
  countAlertsOn(date: string): Promise<SlotAlertCounts>;
  findById(id: string): Promise<SlotRecord | null>;
  list(filter: SlotListFilter): Promise<SlotListItem[]>;
  countByDay(from: string, to: string): Promise<Record<string, StatusCounts>>;
  countByBrand(from: string, to: string, aeId?: string): Promise<BrandStatusCounts[]>;
  // Runs `work` in one transaction holding a lock on each date, so two
  // people booking the same day are handled one after the other.
  withDatesLocked<T>(dates: string[], work: (session: SlotWriteSession) => Promise<T>): Promise<T>;
}

export type { ShiftKind };

export interface ShiftItem {
  producerId: string;
  producerName: string;
  position: string;
  squad: string;
  date: string;
  kind: ShiftKind;
  code: string;
  shiftStart: number | null; // live-day minutes; null on days off and leave
  shiftEnd: number | null;
}

export interface Producer {
  id: string;
  name: string;
  position: string;
  employeeId: string | null;
  squad: string;
  team: string; // PD team, e.g. "M", "Tae", "Cartoon"
}

export interface ProducerInput {
  name: string;
  position: string; // display label, e.g. "Jr. Producer"
  employeeId: string | null;
  squad: string;
  team: string;
}

export interface ShiftEntry {
  producerId: string;
  date: string;
  kind: ShiftKind;
  code: string;
  shiftStart: number | null;
  shiftEnd: number | null;
}

export interface ShiftRepository {
  listInRange(from: string, to: string): Promise<ShiftItem[]>;
  // Replaces these producers' shifts in [from, to] with `entries`, in one transaction.
  replace(from: string, to: string, producerIds: string[], entries: ShiftEntry[]): Promise<void>;
}

export interface ProducerRepository {
  listAll(): Promise<Producer[]>;
  create(input: ProducerInput): Promise<Producer>;
  update(id: string, input: ProducerInput): Promise<Producer>;
  // Deletes the person and their shifts.
  remove(id: string): Promise<void>;
  slotCount(id: string): Promise<number>; // lives they're Producer or Admin on
}

export type NotifyChannel = "planner" | "operation" | "finance";

export interface Notifier {
  notify(channels: NotifyChannel[], text: string): Promise<void>;
}

export interface Clock {
  today(): string; // current live date, "YYYY-MM-DD"
  nowMinute(): number; // current live-day minute
}

export type ApprovalStatus = "pending" | "approved" | "locked";

export interface PaymentAmounts {
  actualStart: number;
  actualEnd: number;
  lateReason: LateReason;
  note: string;
  basePay: number;
  deduction: number;
  otPay: number;
  finalPay: number;
}

export interface Payment extends PaymentAmounts {
  id: string;
  slotId: string;
  approvalStatus: ApprovalStatus;
  recordedByName: string;
  approvedByName: string | null;
}

// A finished live as Payment Tracking shows it, with its payment if recorded.
export interface PaymentRow {
  slotId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  brandName: string;
  platform: string;
  roomName: string;
  mc: { nickname: string; status: string; rateType: RateType; rate: number };
  slotStatus: SlotStatus;
  payment: Payment | null;
}

export interface PaymentSummary {
  toRecord: number;
  pending: { count: number; total: number };
  approved: { count: number; total: number };
  locked: { count: number; total: number };
  otTotal: number;
}

export interface PaymentRepository {
  // Slots with an MC that are either confirmed and over, or already recorded.
  listRows(filter: {
    from: string;
    to: string;
    endedBefore: { date: string; minute: number };
    tab: "toRecord" | ApprovalStatus | "all";
    limit: number;
  }): Promise<PaymentRow[]>;
  summary(from: string, to: string, endedBefore: { date: string; minute: number }): Promise<PaymentSummary>;
  findRow(slotId: string): Promise<PaymentRow | null>;
  findById(paymentId: string): Promise<(Payment & { row: PaymentRow }) | null>;
  // Saves the payment and marks the slot completed in one transaction.
  // Returns false if the payment was approved in the meantime.
  record(slotId: string, amounts: PaymentAmounts, recordedById: string): Promise<boolean>;
  // Moves from one approval status to the next; false if it had already moved.
  advance(paymentId: string, from: ApprovalStatus, to: ApprovalStatus, byUserId: string): Promise<boolean>;
}
