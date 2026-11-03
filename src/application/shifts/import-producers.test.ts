import { describe, expect, it } from "vitest";
import type { Producer, ProducerRepository } from "../ports";
import { importProducers, previewProducerImport } from "./import-producers";

const planner = { userId: "p", name: "Planner", role: "PLANNER" as const };

function fakes() {
  const list: Producer[] = [
    { id: "1", name: "Arm", position: "Jr. Producer", employeeId: "110", squad: "Adidas" },
    { id: "2", name: "Sa", position: "Producer", employeeId: null, squad: "Adidas Shopee" },
    { id: "3", name: "Mor", position: "Producer", employeeId: "300", squad: "" },
  ];
  let seq = 10;
  const producers = {
    listAll: async () => list.map((p) => ({ ...p })),
    create: async (f: Omit<Producer, "id">) => {
      const p = { id: String(++seq), ...f };
      list.push(p);
      return p;
    },
    update: async (id: string, f: Omit<Producer, "id">) => Object.assign(list.find((p) => p.id === id)!, f),
  } as unknown as ProducerRepository;
  return { list, deps: { producers } };
}

const sheet = [
  ["Employee ID", "Name", "Position", "Squad"],
  ["110", "Arm Jr", "", "Puma"], // matched by ID: renamed, new squad, position kept
  ["200", "Sa", "Senior Producer", ""], // matched by name: gets an ID, squad kept
  ["300", "Mor", "Producer", ""], // no change
  ["", "Donut", "", "Banobagi"], // new person
  ["999", "Mor", "", ""], // Mor twice in the file
];

describe("Producer Database upload", () => {
  it("previews matches, changes, new people and problems", async () => {
    const { deps } = fakes();
    const r = await previewProducerImport(deps, planner, sheet);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.counts).toEqual({ new: 1, update: 2, same: 1, error: 1 });
    expect(r.value.items[0].changes).toEqual(["ชื่อ: Arm → Arm Jr", "Squad: Adidas → Puma"]);
    expect(r.value.items[1].changes).toEqual(["รหัส: — → 200", "ตำแหน่ง: Producer → Senior Producer"]);
    expect(r.value.items[4].error).toBe("ชื่อ Mor ซ้ำในไฟล์");
  });

  it("imports adds and updates, and lists skipped rows", async () => {
    const { list, deps } = fakes();
    const r = await importProducers(deps, planner, sheet);
    expect(r).toEqual({ ok: true, value: { added: 1, updated: 2, skipped: [{ name: "แถว 6 Mor", reason: "ชื่อ Mor ซ้ำในไฟล์" }] } });
    expect(list.map((p) => [p.name, p.employeeId, p.position, p.squad])).toEqual([
      ["Arm Jr", "110", "Jr. Producer", "Puma"],
      ["Sa", "200", "Senior Producer", "Adidas Shopee"],
      ["Mor", "300", "Producer", ""],
      ["Donut", null, "Jr. Producer", "Banobagi"],
    ]);
  });

  it("refuses AEs", async () => {
    const { deps } = fakes();
    expect((await importProducers(deps, { ...planner, role: "AE" }, sheet)).ok).toBe(false);
  });
});
