import type { SessionUser } from "../auth/login";
import type { Producer, ProducerInput, ProducerRepository } from "../ports";

export const POSITIONS = ["Producer Team Lead", "Senior Producer", "Producer", "Jr. Producer"];

// Operation and Managers add new staff or correct their details. The
// employee ID is what links a person to the shift sheet.
export async function saveProducer(
  deps: { producers: ProducerRepository },
  user: SessionUser,
  input: ProducerInput,
  id?: string,
): Promise<{ ok: true; producer: Producer } | { ok: false; error: string }> {
  if (user.role !== "OPERATION" && user.role !== "MANAGER") {
    return { ok: false, error: "เฉพาะ Operation และ Manager เท่านั้นที่แก้ข้อมูลพนักงานได้" };
  }
  const name = input.name.replace(/\s+/g, " ").trim();
  const employeeId = input.employeeId?.trim() || null;
  if (!name) return { ok: false, error: "กรุณากรอกชื่อ" };
  if (name.length > 60) return { ok: false, error: "ชื่อยาวเกินไป" };
  if (employeeId && !/^[A-Za-z0-9-]{1,20}$/.test(employeeId)) {
    return { ok: false, error: "รหัสพนักงานใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และ -" };
  }
  if (!POSITIONS.includes(input.position)) return { ok: false, error: "ตำแหน่งไม่ถูกต้อง" };

  const all = await deps.producers.listAll();
  const others = all.filter((p) => p.id !== id);
  if (id && !all.some((p) => p.id === id)) return { ok: false, error: "ไม่พบพนักงานคนนี้" };
  if (others.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: `มีชื่อ "${name}" อยู่แล้ว — ใส่ชื่อที่ต่างกัน เช่น ชื่อเล่น + นามสกุลย่อ` };
  }
  if (employeeId && others.some((p) => p.employeeId === employeeId)) {
    const owner = others.find((p) => p.employeeId === employeeId)!;
    return { ok: false, error: `รหัส ${employeeId} เป็นของ ${owner.name} อยู่แล้ว` };
  }

  const fields = { name, employeeId, position: input.position, squad: input.squad.trim().slice(0, 200) };
  const producer = id ? await deps.producers.update(id, fields) : await deps.producers.create(fields);
  return { ok: true, producer };
}
