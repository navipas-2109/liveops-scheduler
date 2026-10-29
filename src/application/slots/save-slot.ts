import type { SessionUser } from "../auth/login";
import { checkBookingAllowed } from "@/domain/booking";
import { rangesOverlap, fromLiveMinutes, isValidIsoDate, LIVE_DAY_END, LIVE_DAY_START } from "@/domain/time";
import type {
  BookingWindowRepository,
  Brand,
  BrandRepository,
  Clock,
  Notifier,
  Room,
  RoomRepository,
  SlotRecord,
  SlotRepository,
} from "../ports";
import { recomputeStatuses } from "./recompute-statuses";

export interface SlotInput {
  date: string;
  startMinute: number;
  endMinute: number;
  roomId: string;
  brandId: string;
  campaign: string;
  requirement: string;
}

export interface SaveSlotDeps {
  slots: SlotRepository;
  brands: BrandRepository;
  rooms: RoomRepository;
  bookingWindows: BookingWindowRepository;
  notifier: Notifier;
  clock: Clock;
}

export type SaveSlotResult = { ok: true; slot: SlotRecord } | { ok: false; error: string };

export function timeRangeLabel(startMinute: number, endMinute: number) {
  return `${fromLiveMinutes(startMinute)}–${fromLiveMinutes(endMinute)}`;
}

function validateShape(input: SlotInput): string | null {
  if (!isValidIsoDate(input.date)) return "วันที่ไม่ถูกต้อง";
  const { startMinute: s, endMinute: e } = input;
  if (!Number.isInteger(s) || !Number.isInteger(e)) return "เวลาไม่ถูกต้อง";
  if (s < LIVE_DAY_START || e > LIVE_DAY_END) return "เวลาไลฟ์ต้องอยู่ระหว่าง 07:00 ถึง 02:00";
  if (e <= s) return "เวลาจบต้องหลังเวลาเริ่ม";
  if (input.requirement.length > 500 || input.campaign.length > 100) return "ข้อความยาวเกินไป";
  return null;
}

async function allowedBrands(deps: SaveSlotDeps, user: SessionUser): Promise<Brand[]> {
  return user.role === "MANAGER" ? deps.brands.listAll() : deps.brands.listForAe(user.userId);
}

// Creates a slot (no id) or edits one. AEs may only use their own brands,
// only touch their own slots, and only inside an open Booking Window.
// A slot can't be booked into a room that is already taken at that time.
export async function saveSlot(
  deps: SaveSlotDeps,
  user: SessionUser,
  input: SlotInput,
  slotId?: string,
): Promise<SaveSlotResult> {
  if (user.role !== "AE" && user.role !== "MANAGER") {
    return { ok: false, error: "เฉพาะ AE และ Manager เท่านั้นที่ลงสล็อตได้" };
  }
  const shapeError = validateShape(input);
  if (shapeError) return { ok: false, error: shapeError };

  const [brands, rooms, windows] = await Promise.all([
    allowedBrands(deps, user),
    deps.rooms.listAll(),
    deps.bookingWindows.listAll(),
  ]);
  const brand = brands.find((b) => b.id === input.brandId);
  if (!brand) return { ok: false, error: "คุณไม่ได้ดูแลแบรนด์นี้" };
  const room = rooms.find((r) => r.id === input.roomId);
  if (!room) return { ok: false, error: "ไม่พบห้องนี้" };

  const today = deps.clock.today();
  let existing: SlotRecord | null = null;
  if (slotId) {
    existing = await deps.slots.findById(slotId);
    if (!existing) return { ok: false, error: "ไม่พบสล็อตนี้" };
    if (user.role === "AE" && existing.aeId !== user.userId) {
      return { ok: false, error: "แก้ไขได้เฉพาะสล็อตของตัวเอง" };
    }
    if (existing.status === "completed") return { ok: false, error: "สล็อตนี้ไลฟ์เสร็จแล้ว แก้ไขไม่ได้" };
    const oldDateCheck = checkBookingAllowed(user.role, windows, existing.date, today);
    if (!oldDateCheck.ok) return { ok: false, error: oldDateCheck.reason };
  }
  const check = checkBookingAllowed(user.role, windows, input.date, today);
  if (!check.ok) return { ok: false, error: check.reason };

  const dates = existing && existing.date !== input.date ? [input.date, existing.date] : [input.date];
  const result = await deps.slots.withDatesLocked(dates, async (session) => {
    const sameDay = await session.listOnDate(input.date);
    const clash = sameDay.find(
      (o) => o.id !== slotId && o.roomId === input.roomId && rangesOverlap(input, o),
    );
    if (clash) {
      return {
        ok: false as const,
        error: `ห้องนี้ถูกจองแล้วช่วง ${timeRangeLabel(clash.startMinute, clash.endMinute)}`,
      };
    }

    const fields = {
      date: input.date,
      startMinute: input.startMinute,
      endMinute: input.endMinute,
      roomId: input.roomId,
      brandId: input.brandId,
      campaign: input.campaign.trim(),
      requirement: input.requirement.trim(),
    };
    const saved = existing
      ? await session.update(existing.id, fields)
      : await session.create({ ...fields, aeId: user.userId });

    const newConflicts = [];
    for (const date of dates) newConflicts.push(...(await recomputeStatuses(session, date)));
    return { ok: true as const, slot: saved, newConflicts };
  });

  if (!result.ok) return result;
  await notifyAfterSave(deps.notifier, user, brand, room, result.slot, !existing, result.newConflicts);
  return { ok: true, slot: result.slot };
}

async function notifyAfterSave(
  notifier: Notifier,
  user: SessionUser,
  brand: Brand,
  room: Room,
  slot: SlotRecord,
  isNew: boolean,
  newConflicts: SlotRecord[],
) {
  const when = `${slot.date} ${timeRangeLabel(slot.startMinute, slot.endMinute)}`;
  if (isNew) {
    await notifier.notify(
      ["planner"],
      `🆕 สล็อตใหม่รอลง MC\n${brand.brandName} (${brand.platform})\n${when} · ${room.shortName}\nโดย ${user.name}`,
    );
  }
  if (newConflicts.length > 0) {
    await notifier.notify(
      ["planner", "operation"],
      `⚠️ พบคิวชน ${newConflicts.length} สล็อต วันที่ ${slot.date} — กรุณาตรวจสอบใน MC Planning`,
    );
  }
}
