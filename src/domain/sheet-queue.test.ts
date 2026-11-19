import { describe, expect, it } from "vitest";
import { parseSheetDate, parseSheetRows, parseSheetTime } from "./sheet-queue";

describe("Google Sheet MC queue", () => {
  it("reads dates without a year as the nearest one", () => {
    expect(parseSheetDate("1 Dec", "2026-11-19")).toBe("2026-12-01");
    expect(parseSheetDate("30 Dec", "2027-01-05")).toBe("2026-12-30");
    expect(parseSheetDate("2 Jan", "2026-12-20")).toBe("2027-01-02");
    expect(parseSheetDate("2026-12-01", "2026-11-19")).toBe("2026-12-01");
    expect(parseSheetDate("1/12/2026", "2026-11-19")).toBe("2026-12-01");
    expect(parseSheetDate("31 Nov", "2026-11-19")).toBeNull();
    expect(parseSheetDate("tomorrow", "2026-11-19")).toBeNull();
  });

  it("reads times, counting after-midnight ends on the same live day", () => {
    expect(parseSheetTime("7:30")).toBe(450);
    expect(parseSheetTime("0:30")).toBe(24 * 60 + 30);
    expect(parseSheetTime("abc")).toBeNull();
  });

  it("turns rows into queues with stable keys, skipping what can't be read", () => {
    const base = { sheet: "DEC X MC", brand: "puma", channel: "TikTok", date: "1 Dec", note: "", bu: "LIV" };
    const r = parseSheetRows(
      [
        { ...base, row: 4, mc: " Boss ", start: "7:30", end: "10:30" },
        { ...base, row: 5, mc: "Boss", start: "22:30", end: "0:30" },
        { ...base, row: 6, mc: "", start: "7:30", end: "9:30" },
        { ...base, row: 7, mc: "Sari", start: "7:30", end: "" },
        { ...base, row: 8, mc: "", brand: "", start: "", end: "" },
        { ...base, row: 9, mc: "boss", start: "7:30", end: "10:30" },
      ],
      "2026-11-19",
    );
    expect(r.queues.map((q) => [q.key, q.startMinute, q.endMinute])).toEqual([
      ["boss|puma|tiktok|2026-12-01|450|630", 450, 630],
      ["boss|puma|tiktok|2026-12-01|1350|1470", 1350, 1470],
      ["boss|puma|tiktok|2026-12-01|450|630#2", 450, 630],
    ]);
    expect(r.skipped.map((s) => s.row)).toEqual([6, 7]);
  });
});
