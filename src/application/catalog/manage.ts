// Master data kept by the team in the app: rooms, brand channels, staff,
// and confirming (locking) a brand's lives for a month.

import type { SessionUser } from "../auth/login";
import { canChangeLocked } from "@/domain/slot-lock";
import type {
  BrandRepository,
  ProducerRepository,
  Room,
  RoomInput,
  RoomRepository,
  SlotLockRepository,
} from "../ports";

type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

const EDITORS = ["OPERATION", "PLANNER", "MANAGER"];
const NO_RIGHTS = { ok: false as const, error: "คุณไม่มีสิทธิ์แก้ข้อมูลนี้" };
const IN_USE = (n: number) => ({ ok: false as const, error: `ลบไม่ได้ — ใช้อยู่ใน ${n} ไลฟ์` });

export async function saveRoom(
  deps: { rooms: RoomRepository },
  user: SessionUser,
  input: RoomInput,
  id?: string,
): Promise<Result<Room>> {
  if (!EDITORS.includes(user.role)) return NO_RIGHTS;
  const roomNo = input.roomNo.trim();
  if (!roomNo) return { ok: false, error: "กรุณากรอกชื่อห้อง" };
  if (!["Ripples Studio", "Witree"].includes(input.building)) return { ok: false, error: "อาคารไม่ถูกต้อง" };
  if (!["Large", "Small"].includes(input.size)) return { ok: false, error: "ขนาดห้องไม่ถูกต้อง" };
  if (!Number.isInteger(input.floor) || input.floor < 0 || input.floor > 50) return { ok: false, error: "ชั้นไม่ถูกต้อง" };
  const clean = { ...input, roomNo, brandAssignment: input.brandAssignment.trim() };
  return { ok: true, value: id ? await deps.rooms.update(id, clean) : await deps.rooms.create(clean) };
}

export async function deleteRoom(deps: { rooms: RoomRepository }, user: SessionUser, id: string): Promise<Result> {
  if (!EDITORS.includes(user.role)) return NO_RIGHTS;
  const used = await deps.rooms.slotCount(id);
  if (used > 0) return IN_USE(used);
  await deps.rooms.remove(id);
  return { ok: true, value: undefined };
}

export async function addChannel(
  deps: { brands: BrandRepository },
  user: SessionUser,
  brandName: string,
  platform: string,
): Promise<Result> {
  if (!EDITORS.includes(user.role)) return NO_RIGHTS;
  const b = brandName.replace(/\s+/g, " ").trim();
  const p = platform.replace(/\s+/g, " ").trim();
  if (!b || !p) return { ok: false, error: "กรุณากรอกทั้งแบรนด์และ Channel" };
  const all = await deps.brands.listAll();
  if (all.some((x) => x.brandName.toLowerCase() === b.toLowerCase() && x.platform.toLowerCase() === p.toLowerCase())) {
    return { ok: false, error: `มี ${b} (${p}) อยู่แล้ว` };
  }
  // Reuse the existing spelling of a brand or channel if one matches.
  const brand = all.find((x) => x.brandName.toLowerCase() === b.toLowerCase())?.brandName ?? b;
  const channel = all.find((x) => x.platform.toLowerCase() === p.toLowerCase())?.platform ?? p;
  await deps.brands.create(brand, channel);
  return { ok: true, value: undefined };
}

export async function deleteChannel(deps: { brands: BrandRepository }, user: SessionUser, id: string): Promise<Result> {
  if (!EDITORS.includes(user.role)) return NO_RIGHTS;
  const used = await deps.brands.slotCount(id);
  if (used > 0) return IN_USE(used);
  await deps.brands.remove(id);
  return { ok: true, value: undefined };
}

export async function deleteProducer(
  deps: { producers: ProducerRepository },
  user: SessionUser,
  id: string,
): Promise<Result> {
  if (user.role !== "OPERATION" && user.role !== "MANAGER") return NO_RIGHTS;
  const used = await deps.producers.slotCount(id);
  if (used > 0) return IN_USE(used);
  await deps.producers.remove(id);
  return { ok: true, value: undefined };
}

// Anyone who books lives may confirm a brand's month; only Planners unlock.
export async function setBrandLock(
  deps: { locks: SlotLockRepository },
  user: SessionUser,
  brandId: string,
  month: string,
  locked: boolean,
): Promise<Result> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  if (locked) {
    if (!EDITORS.includes(user.role)) return NO_RIGHTS;
    await deps.locks.lock(brandId, month, user.userId);
  } else {
    if (!canChangeLocked(user.role)) return { ok: false, error: "ปลดล็อกได้เฉพาะ Planner" };
    await deps.locks.unlock(brandId, month);
  }
  return { ok: true, value: undefined };
}
