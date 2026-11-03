import { describe, expect, it } from "vitest";
import type { Producer, ProducerRepository, Room, RoomRepository } from "../ports";
import { deleteProducers, updateProducers, updateRooms } from "./bulk";

const planner = { userId: "p", name: "Planner", role: "PLANNER" as const };
const ae = { userId: "a", name: "AE", role: "AE" as const };

function producerFakes() {
  const list: Producer[] = [
    { id: "1", name: "Arm", position: "Jr. Producer", employeeId: null, squad: "Adidas" },
    { id: "2", name: "Sa", position: "Producer", employeeId: "110", squad: "Adidas" },
    { id: "3", name: "Busy", position: "Producer", employeeId: null, squad: "" },
  ];
  const producers = {
    listAll: async () => list.map((p) => ({ ...p })),
    update: async (id: string, f: Omit<Producer, "id">) => Object.assign(list.find((p) => p.id === id)!, f),
    remove: async (id: string) => void list.splice(list.findIndex((p) => p.id === id), 1),
    slotCount: async (id: string) => (id === "3" ? 4 : 0),
  } as unknown as ProducerRepository;
  return { list, deps: { producers } };
}

describe("bulk edit and delete", () => {
  it("changes only the chosen field on every selected producer", async () => {
    const { list, deps } = producerFakes();
    const r = await updateProducers(deps, planner, ["1", "2"], { squad: "Puma" });
    expect(r).toEqual({ ok: true, value: { done: 2, skipped: [] } });
    expect(list.map((p) => [p.squad, p.position])).toEqual([
      ["Puma", "Jr. Producer"],
      ["Puma", "Producer"],
      ["", "Producer"],
    ]);
  });

  it("deletes what it can and lists the rest", async () => {
    const { list, deps } = producerFakes();
    expect((await deleteProducers(deps, ae, ["1"])).ok).toBe(false);
    const r = await deleteProducers(deps, planner, ["1", "3"]);
    expect(r).toEqual({ ok: true, value: { done: 1, skipped: [{ name: "Busy", reason: "ลบไม่ได้ — ใช้อยู่ใน 4 ไลฟ์" }] } });
    expect(list.map((p) => p.id)).toEqual(["2", "3"]);
  });

  it("moves selected rooms to another building, keeping their other details", async () => {
    const rooms: Room[] = [
      { id: "r1", shortName: "Room 1", buildingId: "rs", building: "Ripples Studio", buildingCode: "RS", floor: 2, size: "Small", roomNo: "Room 1", brandAssignment: "Paseo" },
    ];
    const saved: unknown[] = [];
    const deps = {
      rooms: { listAll: async () => rooms, update: async (_id: string, input: unknown) => void saved.push(input) } as unknown as RoomRepository,
      buildings: { listAll: async () => [{ id: "rs" }, { id: "wt" }] } as never,
    };
    expect((await updateRooms(deps, planner, ["r1"], { buildingId: "wt" })).ok).toBe(true);
    expect(saved).toEqual([{ buildingId: "wt", floor: 2, roomNo: "Room 1", size: "Small", brandAssignment: "Paseo" }]);
  });
});
