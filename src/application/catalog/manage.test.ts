import { describe, expect, it } from "vitest";
import type { Brand, BrandRepository, SlotLockRepository } from "../ports";
import { setBrandLock } from "./manage";

const brand = (id: string): Brand => ({ id, brandName: id, platform: "TikTok" }) as Brand;

function fakes() {
  const locked = new Set<string>();
  const locks = {
    listForMonth: async () => [],
    isLocked: async (b: string, m: string) => locked.has(`${b}:${m}`),
    lock: async (b: string, m: string) => void locked.add(`${b}:${m}`),
    unlock: async (b: string, m: string) => void locked.delete(`${b}:${m}`),
  } as SlotLockRepository;
  const brands = { listForAe: async () => [brand("mine")] } as unknown as BrandRepository;
  return { locked, deps: { locks, brands } };
}

const ae = { userId: "ae", name: "AE", role: "AE" as const };
const op = { userId: "op", name: "Op", role: "OPERATION" as const };
const planner = { userId: "pl", name: "Planner", role: "PLANNER" as const };

describe("confirming a brand's month", () => {
  it("lets an AE lock only their own brands", async () => {
    const { locked, deps } = fakes();
    expect((await setBrandLock(deps, ae, "mine", "2026-12", true)).ok).toBe(true);
    expect((await setBrandLock(deps, ae, "other", "2026-12", true)).ok).toBe(false);
    expect([...locked]).toEqual(["mine:2026-12"]);
  });

  it("only Planners (and Managers) unlock", async () => {
    const { locked, deps } = fakes();
    await setBrandLock(deps, op, "x", "2026-12", true);
    expect((await setBrandLock(deps, ae, "mine", "2026-12", false)).ok).toBe(false);
    expect((await setBrandLock(deps, op, "x", "2026-12", false)).ok).toBe(false);
    expect((await setBrandLock(deps, planner, "x", "2026-12", false)).ok).toBe(true);
    expect(locked.size).toBe(0);
  });
});
