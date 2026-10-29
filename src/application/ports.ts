// Interfaces the use cases depend on. Infrastructure provides the real ones;
// tests can pass simple fakes.

import type { BookingWindow } from "@/domain/booking";
import type { LateReason, RateType } from "@/domain/payment";
import type { Role } from "@/domain/roles";
import type { SlotStatus } from "@/domain/slot-rules";

export interface UserCredentials {
  id: string;
  name: string;
  role: Role;
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
}

export interface Room {
  id: string;
  shortName: string;
  building: string;
  floor: number;
  size: string;
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
  status: SlotStatus;
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
>;

export type SlotChanges = Omit<NewSlot, "aeId">;

export interface SlotListFilter {
  from: string;
  to: string;
  aeId?: string;
  roomId?: string;
  brandName?: string;
  status?: SlotStatus;
  limit?: number;
}

export type StatusCounts = Partial<Record<SlotStatus, number>>;

export interface BrandStatusCounts {
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
  setMc(id: string, mcId: string | null, plannerId: string): Promise<void>;
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

export interface ShiftItem {
  producerId: string;
  producerName: string;
  position: string;
  date: string;
  shiftStart: number; // live-day minutes
  shiftEnd: number;
}

export interface ShiftRepository {
  listInRange(from: string, to: string): Promise<ShiftItem[]>;
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
