import type { SlotListItem } from "@/application/ports";
import { fromLiveMinutes } from "@/domain/time";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const HEADERS = ["MC", "Brand", "Channel", "Date", "Start Time", "End Time", "Number of Hrs", "Room", "PD", "Note"];
const PD_COLUMN = HEADERS.indexOf("PD");

// MCs get the sheet without the PD column.
const pick = (cells: string[], withPd: boolean) => (withPd ? cells : cells.filter((_, i) => i !== PD_COLUMN));

// Same spelling as the team's planning sheet: "25 Dec", "22:30", "0:30".
export const sheetDate = (date: string) => `${Number(date.slice(8))} ${MONTHS_EN[Number(date.slice(5, 7)) - 1]}`;
export const sheetTime = (minute: number) => fromLiveMinutes(minute).replace(/^0(\d)/, "$1");
export const hours = (s: SlotListItem) => (s.endMinute - s.startMinute) / 60;

export const pdNames = (s: SlotListItem) => [s.producerName, s.admin1Name].filter(Boolean).join(", ");

export function sheetCells(s: SlotListItem): string[] {
  return [
    s.mcName ?? "",
    s.brandName,
    s.platform,
    sheetDate(s.date),
    sheetTime(s.startMinute),
    sheetTime(s.endMinute),
    String(hours(s)),
    s.roomName,
    pdNames(s),
    s.requirement,
  ];
}

// Tab-separated text pastes straight into Google Sheets cells.
export function toTsv(rows: SlotListItem[], withPd = true): string {
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, " ");
  return [HEADERS, ...rows.map(sheetCells)].map((r) => pick(r, withPd).map(clean).join("\t")).join("\n");
}

export function toCsv(rows: SlotListItem[], withPd = true): string {
  const quote = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // The byte-order mark makes Excel read Thai text correctly.
  return "﻿" + [HEADERS, ...rows.map(sheetCells)].map((r) => pick(r, withPd).map(quote).join(",")).join("\r\n");
}
