import { describe, expect, it } from "vitest";
import type { SlotListItem } from "@/application/ports";
import { sheetOrder } from "@/application/slots/get-mc-sheet-page";
import { sheetDate, sheetTime, toCsv, toTsv } from "./sheet-export";

const slot = (over: Partial<SlotListItem>): SlotListItem =>
  ({
    id: "s",
    date: "2026-12-25",
    startMinute: 22 * 60 + 30,
    endMinute: 24 * 60 + 30,
    brandName: "banobagi",
    platform: "TikTok",
    roomName: "R1",
    mcName: null,
    producerName: "Donut",
    requirement: "",
    ...over,
  }) as SlotListItem;

describe("MC slot sheet", () => {
  it("writes dates and times like the planning sheet", () => {
    expect(sheetDate("2026-12-01")).toBe("1 Dec");
    expect(sheetTime(7 * 60 + 30)).toBe("7:30");
    expect(sheetTime(24 * 60 + 30)).toBe("0:30");
    expect(sheetTime(19 * 60 + 30)).toBe("19:30");
  });

  it("orders by brand, channel, date, then start time", () => {
    const rows = [
      slot({ id: "a", platform: "TikTok", date: "2026-12-02" }),
      slot({ id: "b", platform: "Shopee", date: "2026-12-09" }),
      slot({ id: "c", platform: "Shopee", date: "2026-12-01", startMinute: 600 }),
      slot({ id: "d", brandName: "Adidas" }),
    ].sort(sheetOrder);
    expect(rows.map((r) => r.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("exports TSV for pasting and CSV with Thai-safe quoting", () => {
    const s = slot({ mcName: "Tangmay", requirement: "เลิกไม่เกิน 21:30, ห้ามช้า" });
    expect(toTsv([s]).split("\n")[1]).toBe("Tangmay\tbanobagi\tTikTok\t25 Dec\t22:30\t0:30\t2\tR1\tDonut\tเลิกไม่เกิน 21:30, ห้ามช้า");
    const csv = toCsv([s]);
    expect(csv.startsWith("﻿MC,Brand,")).toBe(true);
    expect(csv).toContain('"เลิกไม่เกิน 21:30, ห้ามช้า"');
  });
});
