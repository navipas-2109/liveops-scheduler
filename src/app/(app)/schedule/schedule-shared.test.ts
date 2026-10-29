import { describe, expect, it } from "vitest";
import type { ShiftItem, SlotListItem } from "@/application/ports";
import { toLiveMinutes as t } from "@/domain/time";
import { outsideShift, pdRows } from "./schedule-shared";

const slot = (id: string, producerId: string | null, start: string, end: string): SlotListItem => ({
  id,
  date: "2026-11-12",
  startMinute: t(start),
  endMinute: t(end),
  roomId: "R01",
  brandId: "b",
  campaign: "",
  requirement: "",
  aeId: "ae",
  mcId: null,
  producerId,
  admin1Id: null,
  status: "waiting",
  brandName: "PUMA",
  platform: "TikTok",
  roomName: "Room 1",
  aeName: "AE",
  mcName: null,
  plannerName: null,
  producerName: producerId ? producerId.toUpperCase() : null,
  admin1Name: null,
  admin2Name: null,
});

const shift = (producerId: string, start: string, end: string): ShiftItem => ({
  producerId,
  producerName: producerId.toUpperCase(),
  position: "Producer",
  date: "2026-11-12",
  shiftStart: t(start),
  shiftEnd: t(end),
});

describe("pdRows", () => {
  it("orders PDs on shift by start time, then PDs without a shift, then unassigned", () => {
    const rows = pdRows(
      [slot("a", "tae", "18:00", "20:00"), slot("b", null, "10:00", "12:00"), slot("c", "guy", "09:00", "11:00")],
      [shift("tae", "13:00", "22:00"), shift("m", "07:00", "16:00")],
    );
    expect(rows.map((r) => r.title)).toEqual(["M", "TAE", "GUY", "ยังไม่มี PD"]);
    expect(rows[1].slots.map((s) => s.id)).toEqual(["a"]);
    expect(rows[0].slots).toEqual([]); // on shift but no lives
  });

  it("flags lives outside the PD's shift", () => {
    expect(outsideShift(slot("a", "tae", "21:00", "23:00"), { start: t("13:00"), end: t("22:00") })).toBe(true);
    expect(outsideShift(slot("a", "tae", "20:00", "22:00"), { start: t("13:00"), end: t("22:00") })).toBe(false);
  });
});
