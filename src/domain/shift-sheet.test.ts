import { describe, expect, it } from "vitest";
import { parseShiftSheet, positionFromTitle } from "./shift-sheet";
import { toLiveMinutes as t } from "./time";

// Same shape as the "2. Shift Planning" tab, copied from column A.
const SHEET = [
  "\t\t\t\tMonth\tNov\t\t",
  "\t110183\tTam\t\tCampaign\t\tDD\tDD",
  "\tEmployee ID\tName\tTitle\tSquad\t1\t2\t3\t31",
  "\t110112\tM\tProducer Team Lead\t\t1\tOF\tOF\t2",
  "\t110215\tFirst\tProducer\tUniqlo\t\t2\t3\t",
  "\t\tWaves\tJr. Producer\tRunning (GQ, Puma )\tVL\t4\tSL\t",
  "\t\t\t\t\t\t\t\t",
].join("\n");

describe("parseShiftSheet", () => {
  it("reads people and their codes per day", () => {
    const r = parseShiftSheet(SHEET, "2026-11");
    if (!r.ok) throw new Error(r.error);
    expect(r.result.people).toEqual([
      { employeeId: "110112", name: "M", title: "Producer Team Lead", squad: "" },
      { employeeId: "110215", name: "First", title: "Producer", squad: "Uniqlo" },
      { employeeId: null, name: "Waves", title: "Jr. Producer", squad: "Running (GQ, Puma )" },
    ]);
    const first = r.result.entries.filter((e) => e.person === 1);
    expect(first).toEqual([
      { person: 1, date: "2026-11-02", kind: "live", code: "2", shiftStart: t("07:30"), shiftEnd: t("16:30") },
      { person: 1, date: "2026-11-03", kind: "live", code: "3", shiftStart: t("16:30"), shiftEnd: t("00:30") },
    ]);
    expect(r.result.entries.find((e) => e.person === 0 && e.date === "2026-11-01")).toMatchObject({
      kind: "off",
      shiftStart: null,
    });
    expect(r.result.entries.find((e) => e.code === "OF")).toMatchObject({ kind: "office" });
    expect(r.result.entries.find((e) => e.code === "VL")).toMatchObject({ kind: "leave" });
  });

  it("skips blanks, counts unknown codes, ignores day 31 in a 30-day month", () => {
    const r = parseShiftSheet(SHEET, "2026-11");
    if (!r.ok) throw new Error(r.error);
    expect(r.result.unknownCodes).toEqual({ SL: 1 });
    expect(r.result.blankCells).toBe(1);
    expect(r.result.entries.some((e) => e.date.endsWith("-31"))).toBe(false);
  });

  it("explains a paste without the header row", () => {
    const r = parseShiftSheet("110112\tM\t1\tOF", "2026-11");
    expect(r.ok).toBe(false);
  });
});

describe("positionFromTitle", () => {
  it("maps sheet titles", () => {
    expect(positionFromTitle("Producer Team Lead")).toBe("Producer Team Lead");
    expect(positionFromTitle("Senior Producer")).toBe("Senior Producer");
    expect(positionFromTitle("Jr. Producer")).toBe("Jr. Producer");
    expect(positionFromTitle("Producer")).toBe("Producer");
  });
});
