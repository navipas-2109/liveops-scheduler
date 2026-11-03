import { describe, expect, it } from "vitest";
import type { SlotListItem, SlotLockRepository, SlotRepository, SlotWriteSession } from "../ports";
import { sendToMcs } from "./send-to-mcs";

const live = (id: string, over: Partial<SlotListItem> = {}) =>
  ({ id, date: "2026-11-10", brandId: "b1", mcId: "boss", mcSent: false, status: "confirmed", ...over }) as SlotListItem;

function fakes(rows: SlotListItem[]) {
  const session = {
    listOnDate: async (date: string) => rows.filter((r) => r.date === date),
    markMcSent: async (id: string) => void (rows.find((r) => r.id === id)!.mcSent = true),
  } as unknown as SlotWriteSession;
  const slots = {
    list: async () => rows.map((r) => ({ ...r })),
    withDatesLocked: (_d: string[], work: (s: SlotWriteSession) => Promise<unknown>) => work(session),
  } as unknown as SlotRepository;
  const locks = { listForMonth: async () => [{ brandId: "b1", month: "2026-11", lockedByName: "", lockedAt: "" }] } as unknown as SlotLockRepository;
  return { slots, locks };
}

const planner = { userId: "p", name: "Planner", role: "PLANNER" as const };

describe("sending MCs their lives", () => {
  it("sends only assigned, unsent lives of confirmed brands, and only by a Planner", async () => {
    const rows = [
      live("a"),
      live("b", { mcId: null }),
      live("c", { brandId: "unlocked" }),
      live("d", { mcSent: true }),
    ];
    const deps = fakes(rows);
    expect((await sendToMcs(deps, { ...planner, role: "AE" }, "2026-11", ["a"])).ok).toBe(false);
    expect(await sendToMcs(deps, planner, "2026-11", ["a", "b", "c", "d"])).toEqual({ ok: true, value: 1 });
    expect(rows.map((r) => r.mcSent)).toEqual([true, false, false, true]);
    expect((await sendToMcs(deps, planner, "2026-11", ["a"])).ok).toBe(false); // nothing left to send
  });
});
