import { describe, expect, it } from "vitest";
import { toLiveMinutes as t } from "@/domain/time";
import type { NewPdBlock, PdBlockRepository, ProducerRepository } from "../ports";
import { closePdTime } from "./pd-blocks";

function fakes() {
  const made: NewPdBlock[] = [];
  const pdBlocks = { createMany: async (b: NewPdBlock[]) => (made.push(...b), b.length) } as unknown as PdBlockRepository;
  const producers = { listAll: async () => [{ id: "a" }, { id: "b" }] } as unknown as ProducerRepository;
  return { made, deps: { pdBlocks, producers } };
}
const planner = { userId: "p", name: "Planner", role: "PLANNER" as const };
const base = { producerIds: ["a", "b"], from: "2026-11-30", to: "2026-12-02", startMinute: t("07:00"), endMinute: t("02:00"), note: " Meeting " };

describe("closing PD time", () => {
  it("closes each chosen PD for every day in the range", async () => {
    const { made, deps } = fakes();
    expect(await closePdTime(deps, planner, base)).toEqual({ ok: true, value: 6 });
    expect(made.map((b) => `${b.producerId} ${b.date}`)).toEqual([
      "a 2026-11-30", "a 2026-12-01", "a 2026-12-02", "b 2026-11-30", "b 2026-12-01", "b 2026-12-02",
    ]);
    expect(made[0].note).toBe("Meeting");
  });

  it("is for Planners, with a sensible range", async () => {
    const { deps } = fakes();
    expect((await closePdTime(deps, { ...planner, role: "AE" }, base)).ok).toBe(false);
    expect((await closePdTime(deps, planner, { ...base, to: "2026-11-01" })).ok).toBe(false);
    expect((await closePdTime(deps, planner, { ...base, endMinute: base.startMinute })).ok).toBe(false);
    expect((await closePdTime(deps, planner, { ...base, producerIds: ["zzz"] })).ok).toBe(false);
  });
});
