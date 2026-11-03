"use server";

import { refresh } from "next/cache";
import type { RoomInput } from "@/application/ports";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

const SIGNED_OUT = { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };

export async function saveRoomAction(input: RoomInput, id?: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.saveRoom(
    user,
    {
      buildingId: String(input.buildingId ?? ""),
      floor: Number(input.floor),
      roomNo: String(input.roomNo ?? ""),
      size: String(input.size ?? ""),
      brandAssignment: String(input.brandAssignment ?? ""),
    },
    id ? String(id) : undefined,
  );
  if (!result.ok) return result;
  refresh();
  return { ok: true as const };
}

export async function saveBuildingAction(input: { name: string; code: string }, id?: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.saveBuilding(
    user,
    { name: String(input.name ?? ""), code: String(input.code ?? "") },
    id ? String(id) : undefined,
  );
  if (result.ok) refresh();
  return result;
}

export async function deleteBuildingAction(id: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.deleteBuilding(user, String(id));
  if (result.ok) refresh();
  return result;
}

export async function deleteRoomAction(id: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.deleteRoom(user, String(id));
  if (result.ok) refresh();
  return result;
}

const ids = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 500) : []);
const text = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function updateRoomsAction(
  selected: string[],
  patch: { buildingId?: string; floor?: number; size?: string; brandAssignment?: string },
) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.updateRooms(user, ids(selected), {
    buildingId: text(patch?.buildingId),
    floor: typeof patch?.floor === "number" ? patch.floor : undefined,
    size: text(patch?.size),
    brandAssignment: text(patch?.brandAssignment),
  });
  if (result.ok) refresh();
  return result;
}

export async function deleteRoomsAction(selected: string[]) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.deleteRooms(user, ids(selected));
  if (result.ok) refresh();
  return result;
}
