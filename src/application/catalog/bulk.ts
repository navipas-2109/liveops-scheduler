// Edit or delete many rows of a database page at once. Each row goes through
// the same checks as a single edit; rows that fail are skipped and listed.

import type { SessionUser } from "../auth/login";
import { saveProducer } from "../shifts/producers";
import type { BrandRepository, BuildingRepository, ProducerRepository, RoomRepository } from "../ports";
import { deleteChannel, deleteProducer, deleteRoom, editChannel, saveRoom } from "./manage";

export interface BulkResult {
  done: number;
  skipped: { name: string; reason: string }[];
}

const MAX = 500;
const EDITORS = ["OPERATION", "PLANNER", "MANAGER"];
type Out = { ok: true; value: BulkResult } | { ok: false; error: string };

async function each<T extends { id: string }>(
  user: SessionUser,
  ids: string[],
  rows: T[],
  label: (row: T) => string,
  work: (row: T) => Promise<{ ok: boolean; error?: string }>,
): Promise<Out> {
  if (!EDITORS.includes(user.role)) return { ok: false, error: "คุณไม่มีสิทธิ์แก้ข้อมูลนี้" };
  if (ids.length === 0) return { ok: false, error: "ยังไม่ได้เลือกรายการ" };
  if (ids.length > MAX) return { ok: false, error: `เลือกได้ครั้งละไม่เกิน ${MAX} รายการ` };
  const result: BulkResult = { done: 0, skipped: [] };
  for (const id of new Set(ids)) {
    const row = rows.find((r) => r.id === id);
    if (!row) continue;
    const r = await work(row);
    if (r.ok) result.done++;
    else result.skipped.push({ name: label(row), reason: r.error ?? "" });
  }
  return { ok: true, value: result };
}

export interface ProducerPatch {
  position?: string;
  squad?: string;
  team?: string;
}

export async function updateProducers(
  deps: { producers: ProducerRepository },
  user: SessionUser,
  ids: string[],
  patch: ProducerPatch,
): Promise<Out> {
  const rows = await deps.producers.listAll();
  return each(user, ids, rows, (p) => p.name, (p) =>
    saveProducer(deps, user, { name: p.name, employeeId: p.employeeId, position: patch.position ?? p.position, squad: patch.squad ?? p.squad, team: patch.team ?? p.team }, p.id),
  );
}

export async function deleteProducers(deps: { producers: ProducerRepository }, user: SessionUser, ids: string[]): Promise<Out> {
  return each(user, ids, await deps.producers.listAll(), (p) => p.name, (p) => deleteProducer(deps, user, p.id));
}

export interface RoomPatch {
  buildingId?: string;
  floor?: number;
  size?: string;
  brandAssignment?: string;
}

export async function updateRooms(
  deps: { rooms: RoomRepository; buildings: BuildingRepository },
  user: SessionUser,
  ids: string[],
  patch: RoomPatch,
): Promise<Out> {
  const rows = await deps.rooms.listAll();
  return each(user, ids, rows, (r) => `${r.building} ${r.roomNo}`, (r) =>
    saveRoom(
      deps,
      user,
      {
        buildingId: patch.buildingId ?? r.buildingId,
        floor: patch.floor ?? r.floor,
        roomNo: r.roomNo,
        size: patch.size ?? r.size,
        brandAssignment: patch.brandAssignment ?? r.brandAssignment,
      },
      r.id,
    ),
  );
}

export async function deleteRooms(deps: { rooms: RoomRepository }, user: SessionUser, ids: string[]): Promise<Out> {
  return each(user, ids, await deps.rooms.listAll(), (r) => `${r.building} ${r.roomNo}`, (r) => deleteRoom(deps, user, r.id));
}

export interface ChannelPatch {
  brandName?: string;
  platform?: string;
}

export async function updateChannels(
  deps: { brands: BrandRepository },
  user: SessionUser,
  ids: string[],
  patch: ChannelPatch,
): Promise<Out> {
  const rows = await deps.brands.listAll();
  return each(user, ids, rows, (b) => `${b.brandName} (${b.platform})`, (b) =>
    editChannel(deps, user, b.id, patch.brandName ?? b.brandName, patch.platform ?? b.platform),
  );
}

export async function deleteChannels(deps: { brands: BrandRepository }, user: SessionUser, ids: string[]): Promise<Out> {
  return each(user, ids, await deps.brands.listAll(), (b) => `${b.brandName} (${b.platform})`, (b) => deleteChannel(deps, user, b.id));
}
