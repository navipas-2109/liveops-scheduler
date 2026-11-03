import { describe, expect, it } from "vitest";
import type { BrandPlan, BrandPlanRepository, BrandRepository, SlotListItem, SlotLockRepository, SlotRepository } from "../ports";
import { approvePlan, confirmReady, setPlan } from "../brand-check/brand-check";
import { deleteBuilding, saveBuilding, setBrandLock } from "./manage";

const brand = (id: string) => ({ id, brandName: id, platform: "TikTok" });

function fakes() {
  const locked = new Set<string>();
  const plans = new Map<string, BrandPlan>();
  const lives: Partial<SlotListItem>[] = [];
  const locks = {
    listForMonth: async (m: string) =>
      [...locked].filter((k) => k.endsWith(m)).map((k) => ({ brandId: k.split(":")[0], month: m, lockedByName: "x", lockedAt: "" })),
    isLocked: async (b: string, m: string) => locked.has(`${b}:${m}`),
    lock: async (b: string, m: string) => void locked.add(`${b}:${m}`),
    unlock: async (b: string, m: string) => void locked.delete(`${b}:${m}`),
  } as SlotLockRepository;
  const planRepo: BrandPlanRepository = {
    listForMonth: async (m) => [...plans.values()].filter((p) => p.month === m),
    find: async (b, m) => plans.get(`${b}:${m}`) ?? null,
    setPlan: async (brandId, month, planMinutes, remark) =>
      void plans.set(`${brandId}:${month}`, { brandId, month, planMinutes, remark, approvedByName: null, approvedAt: null }),
    setApproved: async (b, m, userId) => {
      const p = plans.get(`${b}:${m}`);
      if (p) p.approvedByName = userId;
    },
  };
  const brands = {
    listAll: async () => [brand("mine"), brand("other")],
    listForAe: async () => [brand("mine")],
  } as unknown as BrandRepository;
  const slots = { list: async () => lives } as unknown as SlotRepository;
  return { locked, lives, deps: { locks, brands, slots, plans: planRepo } };
}

const ae = { userId: "ae", name: "AE", role: "AE" as const };
const op = { userId: "op", name: "Op", role: "OPERATION" as const };
const planner = { userId: "pl", name: "Planner", role: "PLANNER" as const };
const M = "2026-12";
const live = (brandId: string, hours: number) => ({ brandId, startMinute: 600, endMinute: 600 + hours * 60, aeName: "AE" });

describe("confirming a brand's month", () => {
  it("needs a plan, matching hours and a Planner's approval", async () => {
    const { locked, lives, deps } = fakes();
    expect(await setBrandLock(deps, ae, "mine", M, true)).toEqual({ ok: false, error: expect.stringContaining("ยังไม่มี Plan") });
    expect((await setPlan(deps, ae, "mine", M, 4, "")).ok).toBe(false); // only Planners set the plan
    expect((await setPlan(deps, planner, "mine", M, 4, "")).ok).toBe(true);

    lives.push(live("mine", 2));
    expect(await setBrandLock(deps, ae, "mine", M, true)).toEqual({ ok: false, error: expect.stringContaining("ยังไม่ครบ") });
    expect((await approvePlan(deps, planner, "mine", M, true)).ok).toBe(false); // hours don't match yet

    lives.push(live("mine", 2));
    expect(await setBrandLock(deps, ae, "mine", M, true)).toEqual({ ok: false, error: expect.stringContaining("รอ Planner Approve") });
    expect((await approvePlan(deps, planner, "mine", M, true)).ok).toBe(true);
    expect((await setBrandLock(deps, ae, "mine", M, true)).ok).toBe(true);
    expect([...locked]).toEqual([`mine:${M}`]);
  });

  it("AEs confirm only their own brands, all ready ones in one go", async () => {
    const { locked, lives, deps } = fakes();
    for (const b of ["mine", "other"]) {
      await setPlan(deps, planner, b, M, 2, "");
      lives.push(live(b, 2));
      await approvePlan(deps, planner, b, M, true);
    }
    expect((await setBrandLock(deps, ae, "other", M, true)).ok).toBe(false);
    expect(await confirmReady(deps, ae, M)).toEqual({ ok: true, value: 1 });
    expect([...locked]).toEqual([`mine:${M}`]);
  });

  it("only Planners (and Managers) unlock", async () => {
    const { locked, deps } = fakes();
    locked.add(`mine:${M}`);
    expect((await setBrandLock(deps, ae, "mine", M, false)).ok).toBe(false);
    expect((await setBrandLock(deps, op, "mine", M, false)).ok).toBe(false);
    expect((await setBrandLock(deps, planner, "mine", M, false)).ok).toBe(true);
    expect(locked.size).toBe(0);
  });
});

describe("buildings", () => {
  function buildings() {
    const list = [
      { id: "rs", name: "Ripples Studio", code: "RS", roomCount: 24 },
      { id: "empty", name: "Old Annex", code: "OA", roomCount: 0 },
    ];
    return {
      list,
      deps: {
        buildings: {
          listAll: async () => list.map((b) => ({ ...b })),
          create: async (name: string, code: string) => void list.push({ id: name, name, code, roomCount: 0 }),
          update: async (id: string, name: string, code: string) => void Object.assign(list.find((b) => b.id === id)!, { name, code }),
          remove: async (id: string) => void list.splice(list.findIndex((b) => b.id === id), 1),
        },
      },
    };
  }

  it("adds and renames buildings, refusing duplicates", async () => {
    const { list, deps } = buildings();
    expect((await saveBuilding(deps, ae, { name: "Witree", code: "wt" })).ok).toBe(false); // AEs can't
    expect((await saveBuilding(deps, planner, { name: " Witree ", code: "wt" })).ok).toBe(true);
    expect(list.at(-1)).toMatchObject({ name: "Witree", code: "WT" });
    expect((await saveBuilding(deps, planner, { name: "witree", code: "W2" })).ok).toBe(false);
    expect((await saveBuilding(deps, planner, { name: "Ripples Studio 1", code: "RS1" }, "rs")).ok).toBe(true);
    expect(list[0].name).toBe("Ripples Studio 1");
  });

  it("deletes only a building with no rooms", async () => {
    const { list, deps } = buildings();
    expect(await deleteBuilding(deps, planner, "rs")).toEqual({ ok: false, error: "ลบไม่ได้ — ยังมี 24 ห้องในตึกนี้" });
    expect((await deleteBuilding(deps, planner, "empty")).ok).toBe(true);
    expect(list.map((b) => b.id)).toEqual(["rs"]);
  });
});
