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
      building: String(input.building ?? ""),
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

export async function deleteRoomAction(id: string) {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const result = await services.deleteRoom(user, String(id));
  if (result.ok) refresh();
  return result;
}
