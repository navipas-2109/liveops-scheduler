import { describe, expect, it } from "vitest";
import { parseProducerSheet } from "./producer-sheet";

describe("parseProducerSheet", () => {
  it("reads the template layout, skipping title rows and blank names", () => {
    const r = parseProducerSheet([
      ["Producer list"],
      [],
      ["Employee ID", "Name", "Position", "Squad"],
      [110568, "Arm", "Jr. Producer", "Adidas Ch1 (TikTok)"],
      ["", "Sa", "senior producer", ""],
      ["", "", "", ""],
      ["120001.0", "New Guy", "", "Puma"],
    ]);
    expect(r).toEqual({
      ok: true,
      people: [
        { row: 4, employeeId: "110568", name: "Arm", position: "Jr. Producer", squad: "Adidas Ch1 (TikTok)" },
        { row: 5, employeeId: null, name: "Sa", position: "Senior Producer", squad: null },
        { row: 7, employeeId: "120001", name: "New Guy", position: null, squad: "Puma" },
      ],
    });
  });

  it("accepts Thai headers in any order", () => {
    const r = parseProducerSheet([["ชื่อ", "ตำแหน่ง", "รหัสพนักงาน"], ["Donut", "Producer Team Lead", "99"]]);
    expect(r.ok && r.people[0]).toMatchObject({ name: "Donut", position: "Producer Team Lead", employeeId: "99" });
  });

  it("explains a sheet without a Name column", () => {
    expect(parseProducerSheet([["a", "b"], ["1", "2"]]).ok).toBe(false);
  });
});
