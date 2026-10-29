import { describe, expect, it } from "vitest";
import {
  currentLiveDate,
  currentLiveMinute,
  liveHasEnded,
  fromIsoDate,
  fromLiveMinutes,
  isValidIsoDate,
  toIsoDate,
  toLiveMinutes,
} from "./time";

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

describe("ISO dates", () => {
  it("round-trips and rejects impossible dates", () => {
    expect(toIsoDate(fromIsoDate("2026-02-28"))).toBe("2026-02-28");
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("26/07/20")).toBe(false);
  });
});

describe("currentLiveMinute / liveHasEnded", () => {
  it("counts the small hours after 24:00", () => {
    expect(currentLiveMinute(new Date("2026-08-01T13:30:00Z"))).toBe(20 * 60 + 30); // 20:30 BKK
    expect(currentLiveMinute(new Date("2026-08-01T18:15:00Z"))).toBe(25 * 60 + 15); // 01:15 BKK
  });

  it("treats a slot as over once its end time has passed", () => {
    const now = { date: "2026-08-01", minute: 20 * 60 };
    expect(liveHasEnded({ date: "2026-07-31", endMinute: 26 * 60 }, now)).toBe(true);
    expect(liveHasEnded({ date: "2026-08-01", endMinute: 20 * 60 }, now)).toBe(true);
    expect(liveHasEnded({ date: "2026-08-01", endMinute: 22 * 60 }, now)).toBe(false);
  });
});
