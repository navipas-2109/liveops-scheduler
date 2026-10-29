import { beforeEach, describe, expect, it } from "vitest";
import type { BookingWindow } from "@/domain/booking";
import { toLiveMinutes as t } from "@/domain/time";
import type { SessionUser } from "../auth/login";
import type { McRepository, NotifyChannel, SlotRecord, SlotRepository, SlotWriteSession } from "../ports";
import { assignMc, getBusyMcs } from "./assign-mc";
import { deleteSlot } from "./delete-slot";
import { saveSlot, type SaveSlotDeps, type SlotInput } from "./save-slot";

const ae: SessionUser = { userId: "ae1", name: "สมชาย", role: "AE" };
const otherAe: SessionUser = { userId: "ae2", name: "วิไล", role: "AE" };
const manager: SessionUser = { userId: "m1", name: "Manager", role: "MANAGER" };
const nov: BookingWindow = { targetMonth: "2026-11", openFrom: "2026-10-20", openTo: "2026-11-05", note: "" };

function fakeDeps(today = "2026-10-29") {
  const rows: SlotRecord[] = [];
  const sent: { channels: NotifyChannel[]; text: string }[] = [];
  let seq = 0;
  const session: SlotWriteSession = {
    listOnDate: async (date) => rows.filter((r) => r.date === date).map((r) => ({ ...r })),
    create: async (slot) => {
      const row: SlotRecord = {
        ...slot,
        id: `s${++seq}`,
        mcId: null,
        producerId: null,
        admin1Id: null,
        status: "waiting",
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
      rows.find((r) => r.id === id)!.mcId = mcId;
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
    },
    rooms: {
      listAll: async () => [
        { id: "R01", shortName: "Room 1", building: "Ripples Studio", floor: 1, size: "Large" },
        { id: "R02", shortName: "Room 2", building: "Ripples Studio", floor: 2, size: "Small" },
      ],
    },
    bookingWindows: { listAll: async () => [nov], save: async () => {} },
    notifier: { notify: async (channels, text) => void sent.push({ channels, text }) },
    clock: { today: () => today, nowMinute: () => 12 * 60 },
  };
  return { deps, rows, sent };
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
