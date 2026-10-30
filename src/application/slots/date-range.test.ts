import { describe, expect, it } from "vitest";
import { rangeFor, weekStart } from "./date-range";

describe("date ranges", () => {
  it("weeks run Monday to Sunday", () => {
    expect(weekStart("2026-11-12")).toBe("2026-11-09"); // Thursday → Monday
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // Sunday → same week
    expect(rangeFor("week", "2026-12-31")).toEqual({ from: "2026-12-28", to: "2027-01-03" });
  });

  it("month and day ranges", () => {
    expect(rangeFor("month", "2026-02-14")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(rangeFor("day", "2026-02-14")).toEqual({ from: "2026-02-14", to: "2026-02-14" });
  });
});
