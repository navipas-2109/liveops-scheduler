import { describe, expect, it } from "vitest";
import { currentLiveDate, fromLiveMinutes, toLiveMinutes } from "./time";

describe("live-day minutes", () => {
  it("counts the small hours as the previous night", () => {
    expect(toLiveMinutes("07:00")).toBe(420);
    expect(toLiveMinutes("01:30")).toBe(25 * 60 + 30);
    expect(toLiveMinutes("24:00")).toBe(toLiveMinutes("00:00"));
    expect(fromLiveMinutes(toLiveMinutes("01:30"))).toBe("01:30");
  });

  it("rejects malformed times", () => {
    expect(() => toLiveMinutes("7pm")).toThrow();
    expect(() => toLiveMinutes("12:75")).toThrow();
  });
});

describe("currentLiveDate", () => {
  it("uses Bangkok time with a 06:00 rollover", () => {
    // 2026-08-01 23:00 UTC = 2026-08-02 06:00 Bangkok → new live day
    expect(currentLiveDate(new Date("2026-08-01T23:00:00Z")).toISOString()).toBe(
      "2026-08-02T00:00:00.000Z",
    );
    // 2026-08-01 22:59 UTC = 2026-08-02 05:59 Bangkok → still 1 Aug
    expect(currentLiveDate(new Date("2026-08-01T22:59:00Z")).toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });
});
