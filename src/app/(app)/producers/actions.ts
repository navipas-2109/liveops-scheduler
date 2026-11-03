"use server";

import { refresh } from "next/cache";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";

export async function saveProducerAction(
  input: { name: string; employeeId: string; position: string; squad: string; team: string },
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
      team: String(input.team ?? ""),
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

const ids = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 500) : []);
const text = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function updateProducersAction(selected: string[], patch: { position?: string; squad?: string; team?: string }) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await services.updateProducers(user, ids(selected), {
    position: text(patch?.position),
    squad: text(patch?.squad),
    team: text(patch?.team),
  });
  if (result.ok) refresh();
  return result;
}

export async function deleteProducersAction(selected: string[]) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await services.deleteProducers(user, ids(selected));
  if (result.ok) refresh();
  return result;
}

// Cells from the uploaded sheet, as text; capped so a huge file can't be sent.
function sheetRows(rows: unknown): string[][] | null {
  if (!Array.isArray(rows) || rows.length > 2100) return null;
  return rows.map((r) => (Array.isArray(r) ? r.slice(0, 20).map((c) => String(c ?? "").slice(0, 300)) : []));
}

export async function previewProducerImportAction(rows: string[][]) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
  const cells = sheetRows(rows);
  if (!cells) return { ok: false as const, error: "ไฟล์ใหญ่เกินไป" };
  return services.previewProducerImport(user, cells);
}

export async function importProducersAction(rows: string[][]) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };
  const cells = sheetRows(rows);
  if (!cells) return { ok: false as const, error: "ไฟล์ใหญ่เกินไป" };
  const result = await services.importProducers(user, cells);
  if (result.ok) refresh();
  return result;
}
