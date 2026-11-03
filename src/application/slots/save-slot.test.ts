import { beforeEach, describe, expect, it } from "vitest";
import type { BookingWindow } from "@/domain/booking";
import { toLiveMinutes as t } from "@/domain/time";
import type { SessionUser } from "../auth/login";
import type { McRepository, NotifyChannel, SlotRecord, SlotRepository, SlotWriteSession } from "../ports";
import { assignMc, getBusyMcs } from "./assign-mc";
import { deleteSlot } from "./delete-slot";
import { joinSlot } from "./join-slot";
import { respondToSlot } from "./mc-respond";
import { saveSlot, type SaveSlotDeps, type SlotInput } from "./save-slot";

const ae: SessionUser = { userId: "ae1", name: "สมชาย", role: "AE" };
const otherAe: SessionUser = { userId: "ae2", name: "วิไล", role: "AE" };
const manager: SessionUser = { userId: "m1", name: "Manager", role: "MANAGER" };
const nov: BookingWindow = { targetMonth: "2026-11", openFrom: "2026-10-20", openTo: "2026-11-05", note: "" };

function fakeDeps(today = "2026-10-29") {
  const rows: SlotRecord[] = [];
  const sent: { channels: NotifyChannel[]; text: string }[] = [];
  const locked = new Set<string>();
  const cleared: string[] = [];
  const shiftsConfirmed = new Set(["2026-11"]);
  let seq = 0;
  const session: SlotWriteSession = {
    listOnDate: async (date) => rows.filter((r) => r.date === date).map((r) => ({ ...r })),
    create: async (slot) => {
      const row: SlotRecord = {
        ...slot,
        id: `s${++seq}`,
        mcId: null,
        producerId: slot.producerId ?? null,
        admin1Id: slot.admin1Id ?? null,
        admin2Id: null,
        status: "waiting",
        mcSent: false,
        mcConfirmed: false,
      };
      rows.push(row);
      return { ...row };
    },
    update: async (id, changes) => {
      const row = rows.find((r) => r.id === id)!;
      Object.assign(row, changes);
      return { ...row };
    },
    remove: async (id) => {
      rows.splice(rows.findIndex((r) => r.id === id), 1);
    },
    setStatus: async (id, status) => {
      rows.find((r) => r.id === id)!.status = status;
    },
    setMc: async (id, mcId) => {
      Object.assign(rows.find((r) => r.id === id)!, { mcId, mcSent: false, mcConfirmed: false });
    },
    markMcSent: async (id) => {
      rows.find((r) => r.id === id)!.mcSent = true;
    },
    setMcConfirmed: async (id, confirmed) => {
      rows.find((r) => r.id === id)!.mcConfirmed = confirmed;
    },
    clearMc: async (id) => {
      Object.assign(rows.find((r) => r.id === id)!, { mcId: null, mcSent: false, mcConfirmed: false });
    },
    setStaff: async (id, staff) => {
      Object.assign(rows.find((r) => r.id === id)!, staff);
    },
  };
  const slots = {
    findById: async (id: string) => rows.find((r) => r.id === id) ?? null,
    list: async ({ from }: { from: string }) =>
      rows
        .filter((r) => r.date === from)
        .map((r) => ({ ...r, brandName: "PUMA", platform: "TikTok", roomName: r.roomId, aeName: "AE" })),
    withDatesLocked: (_dates: string[], work: (s: SlotWriteSession) => Promise<unknown>) => work(session),
  } as unknown as SlotRepository;
  const brand = (id: string) => ({ id, brandName: id.toUpperCase(), platform: "TikTok" });
  const deps: SaveSlotDeps & { mcs: McRepository } = {
    mcs: {
      listAll: async () => [],
      findById: async (id) =>
        ["boss", "sari"].includes(id)
          ? { id, nickname: id, fullName: id, status: "Exclusive", rateType: "per_slot", rate: 8000 }
          : null,
    },
    slots,
    brands: {
      listAll: async () => [brand("puma"), brand("cosrx")],
      listForAe: async (userId) => (userId === "ae1" ? [brand("puma")] : [brand("cosrx")]),
      create: async () => brand("x"),
      update: async () => {},
      remove: async () => {},
      slotCount: async () => 0,
    },
    rooms: {
      listAll: async () => [
        { id: "R01", shortName: "Room 1", buildingId: "b", building: "Ripples Studio", buildingCode: "RS", floor: 1, size: "Large", roomNo: "Room 1", brandAssignment: "" },
        { id: "R02", shortName: "Room 2", buildingId: "b", building: "Ripples Studio", buildingCode: "RS", floor: 2, size: "Small", roomNo: "Room 2", brandAssignment: "" },
      ],
      create: async () => ({}) as never,
      update: async () => ({}) as never,
      remove: async () => {},
      slotCount: async () => 0,
    },
    bookingWindows: { listAll: async () => [nov], save: async () => {} },
    locks: {
      listForMonth: async () => [],
      isLocked: async (brandId, month) => locked.has(`${brandId}|${month}`),
      lock: async (brandId, month) => void locked.add(`${brandId}|${month}`),
      unlock: async (brandId, month) => void locked.delete(`${brandId}|${month}`),
    },
    shiftMonths: {
      find: async (month) => (shiftsConfirmed.has(month) ? { month, confirmedByName: "Planner", confirmedAt: "" } : null),
      confirm: async (month) => void shiftsConfirmed.add(month),
      unconfirm: async (month) => void shiftsConfirmed.delete(month),
    },
    plans: {
      listForMonth: async () => [],
      find: async () => null,
      setPlan: async () => {},
      setApproved: async (brandId, month, userId) => void cleared.push(`${brandId}|${month}|${userId}`),
    },
    producers: {
      listAll: async () =>
        ["pd1", "pd2", "pd3"].map((id) => ({ id, name: id, position: "Producer", employeeId: null, squad: "", team: "" })),
      create: async () => ({}) as never,
      update: async () => ({}) as never,
      remove: async () => {},
      slotCount: async () => 0,
    },
    notifier: { notify: async (channels, text) => void sent.push({ channels, text }) },
    clock: { today: () => today, nowMinute: () => 12 * 60 },
  };
  return { deps, rows, sent, locked, cleared, shiftsConfirmed };
}

function input(overrides: Partial<SlotInput> = {}): SlotInput {
  return {
    date: "2026-11-10",
    startMinute: t("10:00"),
    endMinute: t("12:00"),
    roomId: "R01",
    brandId: "puma",
    campaign: "",
    requirement: "Beauty",
    ...overrides,
  };
}

describe("saveSlot", () => {
  let env: ReturnType<typeof fakeDeps>;
  beforeEach(() => {
    env = fakeDeps();
  });

  it("creates a waiting slot and tells the Planner group", async () => {
    const r = await saveSlot(env.deps, ae, input());
    expect(r.ok && r.slot.status).toBe("waiting");
    expect(env.sent[0].channels).toEqual(["planner"]);
    expect(env.sent[0].text).toContain("PUMA (TikTok)");
  });

  it("refuses a room that is already booked at that time", async () => {
    await saveSlot(env.deps, ae, input());
    const r = await saveSlot(env.deps, ae, input({ startMinute: t("11:00"), endMinute: t("13:00") }));
    expect(r).toEqual({ ok: false, error: "ห้องนี้ถูกจองแล้วช่วง 10:00–12:00" });
    const back = await saveSlot(env.deps, ae, input({ startMinute: t("12:00"), endMinute: t("14:00") }));
    expect(back.ok).toBe(true);
  });

  it("keeps AEs to their own brands, own slots and the booking window", async () => {
    expect((await saveSlot(env.deps, ae, input({ brandId: "cosrx" }))).ok).toBe(false);
    expect((await saveSlot(env.deps, ae, input({ date: "2026-12-01" }))).ok).toBe(false);
    const created = await saveSlot(env.deps, ae, input());
    const id = created.ok ? created.slot.id : "";
    const edit = await saveSlot(env.deps, otherAe, input({ brandId: "cosrx" }), id);
    expect(edit).toEqual({ ok: false, error: "แก้ไขได้เฉพาะสล็อตของตัวเอง" });
  });

  it("blocks AEs after the window closes but not Managers", async () => {
    const closed = fakeDeps("2026-11-06");
    expect((await saveSlot(closed.deps, ae, input())).ok).toBe(false);
    expect((await saveSlot(closed.deps, manager, input({ date: "2027-01-05" }))).ok).toBe(true);
  });

  it("rejects bad times", async () => {
    expect(await saveSlot(env.deps, ae, input({ startMinute: t("12:00"), endMinute: t("12:00") }))).toEqual({
      ok: false,
      error: "เวลาจบต้องหลังเวลาเริ่ม",
    });
    expect((await saveSlot(env.deps, ae, input({ startMinute: t("06:00") }))).ok).toBe(false);
  });

  it("moving a slot away clears an MC conflict it caused", async () => {
    const a = await saveSlot(env.deps, ae, input());
    const b = await saveSlot(env.deps, ae, input({ roomId: "R02" }));
    // Same MC on both → both conflict (as the Planner would cause).
    for (const r of env.rows) r.mcId = "boss";
    env.rows.forEach((r) => (r.status = "conflict"));
    const bId = b.ok ? b.slot.id : "";
    await saveSlot(env.deps, ae, input({ roomId: "R02", startMinute: t("14:00"), endMinute: t("16:00") }), bId);
    expect(env.rows.map((r) => r.status)).toEqual(["confirmed", "confirmed"]);
    expect(a.ok).toBe(true);
  });

  it("deleting a slot also clears conflicts", async () => {
    await saveSlot(env.deps, ae, input());
    const b = await saveSlot(env.deps, ae, input({ roomId: "R02" }));
    for (const r of env.rows) r.mcId = "boss";
    env.rows.forEach((r) => (r.status = "conflict"));
    const res = await deleteSlot(env.deps, ae, b.ok ? b.slot.id : "");
    expect(res.ok).toBe(true);
    expect(env.rows.map((r) => r.status)).toEqual(["confirmed"]);
  });
});

describe("assignMc", () => {
  const planner: SessionUser = { userId: "p1", name: "Planner", role: "PLANNER" };

  it("confirms the slot and blocks a double-booked MC", async () => {
    const env = fakeDeps();
    const a = await saveSlot(env.deps, ae, input());
    const b = await saveSlot(env.deps, ae, input({ roomId: "R02", startMinute: t("11:00"), endMinute: t("13:00") }));
    const [aId, bId] = [a.ok ? a.slot.id : "", b.ok ? b.slot.id : ""];

    expect(await assignMc(env.deps, planner, aId, "boss")).toEqual({ ok: true });
    expect(env.rows[0].status).toBe("confirmed");
    expect(await getBusyMcs(env.deps, bId)).toHaveProperty("boss");
    expect(await assignMc(env.deps, planner, bId, "boss")).toEqual({
      ok: false,
      error: "boss ติดไลฟ์อื่นช่วง 10:00–12:00",
    });
    expect(await assignMc(env.deps, planner, bId, "sari")).toEqual({ ok: true });
    expect(env.sent.at(-1)!.text).toContain("ลง MC sari");
  });

  it("removing the MC puts the slot back to waiting; AEs can't assign", async () => {
    const env = fakeDeps();
    const a = await saveSlot(env.deps, ae, input());
    const id = a.ok ? a.slot.id : "";
    expect((await assignMc(env.deps, ae, id, "boss")).ok).toBe(false);
    await assignMc(env.deps, planner, id, "boss");
    await assignMc(env.deps, planner, id, null);
    expect(env.rows[0]).toMatchObject({ mcId: null, status: "waiting" });
  });

  it("won't change the MC of a completed live", async () => {
    const env = fakeDeps();
    const a = await saveSlot(env.deps, ae, input());
    env.rows[0].status = "completed";
    expect(await assignMc(env.deps, planner, a.ok ? a.slot.id : "", "boss")).toEqual({
      ok: false,
      error: "ไลฟ์นี้จบและบันทึกแล้ว เปลี่ยน MC ไม่ได้",
    });
  });
});

describe("brand locks", () => {
  const planner: SessionUser = { userId: "p1", name: "Planner", role: "PLANNER" };
  const operation: SessionUser = { userId: "op", name: "Operation", role: "OPERATION" };

  it("Operation can book for a PD; once the brand-month is locked only Planners can change it", async () => {
    const env = fakeDeps();
    const r = await saveSlot(env.deps, operation, input({ producerId: "pd1" }));
    expect(r.ok && env.rows[0].producerId).toBe("pd1");
    const id = r.ok ? r.slot.id : "";

    env.locked.add("puma|2026-11");
    const blocked = await saveSlot(env.deps, operation, input({ startMinute: t("13:00"), endMinute: t("15:00") }), id);
    expect(blocked).toEqual({ ok: false, error: "แบรนด์นี้ล็อกสล็อตเดือนนี้แล้ว — แก้ไขได้เฉพาะ Planner" });
    expect((await saveSlot(env.deps, ae, input({ date: "2026-11-11" }))).ok).toBe(false);
    expect((await deleteSlot(env.deps, operation, id)).ok).toBe(false);

    const byPlanner = await saveSlot(env.deps, planner, input({ startMinute: t("13:00"), endMinute: t("15:00") }), id);
    expect(byPlanner.ok).toBe(true);
    expect((await deleteSlot(env.deps, planner, id)).ok).toBe(true);
  });
});

describe("two PDs on one live", () => {
  const operation: SessionUser = { userId: "op", name: "Operation", role: "OPERATION" };

  it("saves a second PD, but not the same person twice", async () => {
    const env = fakeDeps();
    const r = await saveSlot(env.deps, operation, input({ producerId: "pd1", secondPdId: "pd2" }));
    expect(r.ok && [env.rows[0].producerId, env.rows[0].admin1Id]).toEqual(["pd1", "pd2"]);
    const same = await saveSlot(env.deps, operation, input({ roomId: "R02", producerId: "pd1", secondPdId: "pd1" }));
    expect(same.ok).toBe(false);
  });

  it("a second PD joins the booked live instead of booking the room again", async () => {
    const env = fakeDeps();
    const r = await saveSlot(env.deps, operation, input({ producerId: "pd1" }));
    const id = r.ok ? r.slot.id : "";
    expect((await saveSlot(env.deps, operation, input({ producerId: "pd2" }))).ok).toBe(false); // room taken

    expect(await joinSlot(env.deps, operation, id, "pd2")).toEqual({ ok: true });
    expect(env.rows).toHaveLength(1);
    expect([env.rows[0].producerId, env.rows[0].admin1Id]).toEqual(["pd1", "pd2"]);
    expect((await joinSlot(env.deps, operation, id, "pd2")).ok).toBe(false); // already in
    expect(await joinSlot(env.deps, operation, id, "pd3")).toEqual({ ok: false, error: "ไลฟ์นี้มี PD ครบ 2 คนแล้ว" });

    env.locked.add("puma|2026-11");
    const env2 = fakeDeps();
    const r2 = await saveSlot(env2.deps, operation, input({ producerId: "pd1" }));
    env2.locked.add("puma|2026-11");
    expect((await joinSlot(env2.deps, operation, r2.ok ? r2.slot.id : "", "pd2")).ok).toBe(false); // locked
  });
});

describe("Planner approval", () => {
  it("is cleared when a brand's lives change", async () => {
    const env = fakeDeps();
    const r = await saveSlot(env.deps, manager, input());
    expect(env.cleared).toEqual(["puma|2026-11|null"]);
    await saveSlot(env.deps, manager, input({ brandId: "cosrx" }), r.ok ? r.slot.id : "");
    expect(env.cleared.slice(1)).toEqual(["cosrx|2026-11|null", "puma|2026-11|null"]);
    await deleteSlot(env.deps, manager, r.ok ? r.slot.id : "");
    expect(env.cleared.at(-1)).toBe("cosrx|2026-11|null");
  });
});

describe("MC answers for their lives", () => {
  const planner: SessionUser = { userId: "p1", name: "Planner", role: "PLANNER" };
  const boss: SessionUser = { userId: "u-boss", name: "Boss", role: "MC", mcId: "boss" };
  const sari: SessionUser = { userId: "u-sari", name: "Sari", role: "MC", mcId: "sari" };

  it("confirms, unticks or removes only their own live", async () => {
    const env = fakeDeps();
    const r = await saveSlot(env.deps, planner, input());
    const id = r.ok ? r.slot.id : "";
    await assignMc(env.deps, planner, id, "boss");
    expect((await respondToSlot(env.deps, boss, id, "confirm")).ok).toBe(false); // not sent yet
    env.rows[0].mcSent = true;

    expect((await respondToSlot(env.deps, sari, id, "confirm")).ok).toBe(false);
    expect(await respondToSlot(env.deps, boss, id, "confirm")).toEqual({ ok: true });
    expect(env.rows[0].mcConfirmed).toBe(true);
    await respondToSlot(env.deps, boss, id, "unconfirm");
    expect(env.rows[0].mcConfirmed).toBe(false);

    expect(await respondToSlot(env.deps, boss, id, "remove")).toEqual({ ok: true });
    expect(env.rows[0]).toMatchObject({ mcId: null, status: "waiting" });
    expect(env.sent.at(-1)?.text).toContain("ถอนชื่อออก");
  });

  it("a new MC has to confirm again", async () => {
    const env = fakeDeps();
    const r = await saveSlot(env.deps, planner, input());
    const id = r.ok ? r.slot.id : "";
    await assignMc(env.deps, planner, id, "boss");
    env.rows[0].mcSent = true;
    await respondToSlot(env.deps, boss, id, "confirm");
    await assignMc(env.deps, planner, id, "sari");
    expect(env.rows[0]).toMatchObject({ mcId: "sari", mcSent: false, mcConfirmed: false });
  });
});

describe("AE booking waits for confirmed shifts", () => {
  it("refuses until the Planner confirms the month's shifts", async () => {
    const env = fakeDeps();
    env.shiftsConfirmed.clear();
    const r = await saveSlot(env.deps, ae, input());
    expect(r).toEqual({ ok: false, error: "รอ Planner ยืนยันกะ Producer เดือน 2026-11 ก่อน จึงจะลงสล็อตได้" });
    expect((await saveSlot(env.deps, manager, input())).ok).toBe(true); // office staff aren't held up
    env.shiftsConfirmed.add("2026-11");
    expect((await saveSlot(env.deps, ae, input({ roomId: "R02" }))).ok).toBe(true);
  });
});
