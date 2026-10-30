import { describe, expect, it } from "vitest";
import type { SessionUser } from "../auth/login";
import type { Producer, ProducerRepository, ShiftEntry, ShiftRepository } from "../ports";
import { importShifts, previewShiftImport } from "./import-shifts";
import { saveProducer } from "./producers";

const operation: SessionUser = { userId: "op", name: "Operation", role: "OPERATION" };
const ae: SessionUser = { userId: "ae", name: "AE", role: "AE" };

function fakes() {
  const producers: Producer[] = [
    { id: "p1", name: "M", position: "Producer Team Lead", employeeId: null, squad: "" },
    { id: "p2", name: "First", position: "Producer", employeeId: "110215", squad: "" },
    { id: "p3", name: "Ice", position: "Jr. Producer", employeeId: "110001", squad: "" },
  ];
  let stored: ShiftEntry[] = [
    { producerId: "p1", date: "2026-11-01", kind: "live", code: "", shiftStart: 600, shiftEnd: 1200 },
    { producerId: "p3", date: "2026-11-01", kind: "live", code: "", shiftStart: 600, shiftEnd: 1200 },
  ];
  let seq = 10;
  const producerRepo: ProducerRepository = {
    listAll: async () => producers.map((p) => ({ ...p })),
    create: async (input) => {
      const p = { id: `p${++seq}`, ...input };
      producers.push(p);
      return { ...p };
    },
    update: async (id, input) => {
      Object.assign(producers.find((p) => p.id === id)!, input);
      return { ...producers.find((p) => p.id === id)! };
    },
  };
  const shiftRepo: ShiftRepository = {
    listInRange: async () => [],
    replace: async (from, to, ids, entries) => {
      stored = stored.filter((e) => !(ids.includes(e.producerId) && e.date >= from && e.date <= to));
      stored.push(...entries);
    },
  };
  return { producers, deps: { producers: producerRepo, shifts: shiftRepo }, stored: () => stored };
}

const SHEET = [
  "Employee ID\tName\tTitle\tSquad\t1\t2\t3",
  "110112\tM\tProducer Team Lead\t\t1\tOF\tOF",
  "110215\tFirst (renamed)\tProducer\tUniqlo\t\t2\t3",
  "110999\tIce\tJr. Producer\tAdidas Shopee\t4\t4\t1",
  "110777\tWaves\tJr. Producer\tRunning (GQ, Puma )\tVL\t2\t",
].join("\n");

describe("shift import", () => {
  it("previews matches by ID, by name, and new people", async () => {
    const { deps } = fakes();
    const r = await previewShiftImport(deps, operation, { month: "2026-11", text: SHEET });
    if (!r.ok) throw new Error(r.error);
    expect(r.value.people.map((p) => [p.name, p.match, p.existingName])).toEqual([
      ["M", "name", "M"], // no ID in the app yet
      ["First (renamed)", "id", "First"], // ID wins over a changed nickname
      ["Ice", "new", null], // same nickname, different person
      ["Waves", "new", null],
    ]);
    expect(r.value.codeCounts).toEqual({ "1": 2, OF: 2, "2": 2, "3": 1, "4": 2, VL: 1 });
  });

  it("adds new staff, links IDs, and replaces only that month for people in the sheet", async () => {
    const env = fakes();
    const r = await importShifts(env.deps, operation, { month: "2026-11", text: SHEET });
    expect(r).toEqual({ ok: true, value: { people: 4, added: 2, entries: 10 } });
    expect(env.producers.find((p) => p.id === "p1")).toMatchObject({ employeeId: "110112" });
    expect(env.producers.find((p) => p.id === "p2")).toMatchObject({ name: "First", squad: "Uniqlo" });
    expect(env.producers.map((p) => p.name)).toContain("Ice (110999)");
    // The old Nov 1 shift for M is replaced; the other Ice (not in the sheet) keeps theirs.
    expect(env.stored().filter((e) => e.producerId === "p1").map((e) => e.code)).toEqual(["1", "OF", "OF"]);
    expect(env.stored().some((e) => e.producerId === "p3")).toBe(true);
  });

  it("is limited to Operation and Managers", async () => {
    const { deps } = fakes();
    expect((await importShifts(deps, ae, { month: "2026-11", text: SHEET })).ok).toBe(false);
  });
});

describe("saveProducer", () => {
  it("adds someone new linked to their employee ID", async () => {
    const { deps } = fakes();
    const r = await saveProducer(deps, operation, {
      name: "Donut",
      employeeId: "110568",
      position: "Jr. Producer",
      squad: "Adidas Ch1 (TikTok)",
    });
    expect(r.ok && r.producer).toMatchObject({ name: "Donut", employeeId: "110568" });
  });

  it("refuses duplicate IDs and names", async () => {
    const { deps } = fakes();
    const dupId = await saveProducer(deps, operation, {
      name: "New",
      employeeId: "110215",
      position: "Producer",
      squad: "",
    });
    expect(dupId).toEqual({ ok: false, error: "รหัส 110215 เป็นของ First อยู่แล้ว" });
    const dupName = await saveProducer(deps, operation, { name: "first", employeeId: null, position: "Producer", squad: "" });
    expect(dupName.ok).toBe(false);
    // Editing yourself with your own ID is fine.
    const self = await saveProducer(deps, operation, { name: "First", employeeId: "110215", position: "Senior Producer", squad: "" }, "p2");
    expect(self.ok).toBe(true);
  });
});

describe("getStaffGrid", () => {
  it("builds per-person codes, assignments and daily totals", async () => {
    const { getStaffGrid } = await import("./staff-shift");
    const shift = (producerId: string, date: string, code: string, kind: "live" | "office" | "off" | "leave") => ({
      producerId,
      producerName: producerId,
      position: "Producer",
      squad: "",
      date,
      kind,
      code,
      shiftStart: kind === "live" ? 450 : null,
      shiftEnd: kind === "live" ? 990 : null,
    });
    const slot = (id: string, date: string, producerId: string | null, admin1Id: string | null) =>
      ({ id, date, producerId, admin1Id, admin2Id: null }) as never;
    const grid = await getStaffGrid(
      {
        shifts: {
          listInRange: async () => [shift("p1", "2026-11-02", "2", "live"), shift("p2", "2026-11-02", "1", "off")],
          replace: async () => {},
        },
        slots: {
          list: async () => [slot("a", "2026-11-02", "p1", "p2"), slot("b", "2026-11-02", "p1", null)],
        } as never,
        producers: {
          listAll: async () => [
            { id: "p2", name: "Jr", position: "Jr. Producer", employeeId: null, squad: "" },
            { id: "p1", name: "Lead", position: "Producer Team Lead", employeeId: null, squad: "" },
            { id: "p3", name: "Idle", position: "Producer", employeeId: null, squad: "" },
          ],
          create: async () => ({}) as never,
          update: async () => ({}) as never,
        },
        clock: { today: () => "2026-11-02", nowMinute: () => 600 },
      },
      operation,
      { view: "week", date: "2026-11-02", from: "2026-11-02", to: "2026-11-08" },
    );
    expect(grid.days).toHaveLength(7);
    expect(grid.people.map((p) => p.name)).toEqual(["Lead", "Jr"]); // leads first, idle people left out
    expect(grid.codes.p1["2026-11-02"]).toBe("2");
    expect(grid.assigned.p1["2026-11-02"]).toBe(2);
    expect(grid.totals["2026-11-02"]).toEqual({ live: 1, office: 0, away: 1, lives: 2, notReady: 1 });
  });
});
