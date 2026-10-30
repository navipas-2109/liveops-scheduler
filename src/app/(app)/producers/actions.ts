"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

export async function saveProducerAction(
  input: { name: string; employeeId: string; position: string; squad: string },
  id?: string,
) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await services.saveProducer(
    user,
    {
      name: String(input.name ?? ""),
      employeeId: String(input.employeeId ?? "") || null,
      position: String(input.position ?? ""),
      squad: String(input.squad ?? ""),
    },
    id ? String(id) : undefined,
  );
  if (!result.ok) return result;
  refresh();
  return { ok: true as const };
}

export async function deleteProducerAction(id: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await services.deleteProducer(user, String(id));
  if (result.ok) refresh();
  return result;
}
