import { describe, expect, it } from "vitest";
import { deriveSlotStatus, findConflicts, type SlotForConflictCheck } from "./slot-rules";
import { toLiveMinutes as t } from "./time";

function s(
  id: string,
  start: string,
  end: string,
  roomId: string,
  mcId: string | null,
  date = "2026-08-01",
): SlotForConflictCheck {
  return { id, date, startMinute: t(start), endMinute: t(end), roomId, mcId };
}

describe("findConflicts", () => {
  it("flags the same MC in two rooms at overlapping times", () => {
    const c = findConflicts(s("a", "12:00", "14:00", "R1", "boss"), [
      s("b", "13:00", "15:00", "R2", "boss"),
    ]);
    expect(c).toEqual({ roomClashes: [], mcClashes: ["b"] });
  });

  it("flags two bookings of the same room", () => {
    const c = findConflicts(s("a", "10:00", "12:00", "R1", null), [
      s("b", "11:00", "13:00", "R1", "boss"),
    ]);
    expect(c).toEqual({ roomClashes: ["b"], mcClashes: [] });
  });

  it("allows back-to-back slots and other dates", () => {
    const c = findConflicts(s("a", "10:00", "12:00", "R1", "boss"), [
      s("b", "12:00", "14:00", "R1", "boss"),
      s("c", "10:00", "12:00", "R1", "boss", "2026-08-02"),
    ]);
    expect(c).toEqual({ roomClashes: [], mcClashes: [] });
  });

  it("detects overlap across midnight", () => {
    const c = findConflicts(s("a", "23:00", "01:00", "R1", null), [
      s("b", "00:30", "02:00", "R1", null),
    ]);
    expect(c.roomClashes).toEqual(["b"]);
  });
});

describe("deriveSlotStatus", () => {
  const none = { roomClashes: [], mcClashes: [] };
  it("follows the status rules", () => {
    expect(deriveSlotStatus("waiting", null, none)).toBe("waiting");
    expect(deriveSlotStatus("waiting", "boss", none)).toBe("confirmed");
    expect(deriveSlotStatus("confirmed", "boss", { roomClashes: [], mcClashes: ["x"] })).toBe(
      "conflict",
    );
    expect(deriveSlotStatus("completed", "boss", { roomClashes: ["x"], mcClashes: [] })).toBe(
      "completed",
    );
  });
});
