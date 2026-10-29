// Interfaces the use cases depend on. Infrastructure provides the real ones;
// tests can pass simple fakes.

import type { BookingWindow } from "@/domain/booking";
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

export type NotifyChannel = "planner" | "operation" | "finance";

export interface Notifier {
  notify(channels: NotifyChannel[], text: string): Promise<void>;
}

export interface Clock {
  today(): string; // current live date, "YYYY-MM-DD"
}
