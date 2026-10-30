import { describe, expect, it } from "vitest";
import { checkBookingAllowed, currentWindow, type BookingWindow } from "./booking";

const aug: BookingWindow = {
  targetMonth: "2026-08",
  openFrom: "2026-07-01",
  openTo: "2026-07-15",
  note: "",
};
const sep: BookingWindow = {
  targetMonth: "2026-09",
  openFrom: "2026-08-01",
  openTo: "2026-08-15",
  note: "",
};

describe("checkBookingAllowed", () => {
  it("lets an AE book the target month while the window is open", () => {
    expect(checkBookingAllowed("AE", [aug], "2026-08-20", "2026-07-15")).toEqual({ ok: true });
  });

  it("blocks an AE outside the window or for another month", () => {
    expect(checkBookingAllowed("AE", [aug], "2026-08-20", "2026-07-16").ok).toBe(false);
    expect(checkBookingAllowed("AE", [aug], "2026-09-02", "2026-07-10").ok).toBe(false);
  });

  it("only limits AEs", () => {
    expect(checkBookingAllowed("MANAGER", [], "2026-12-01", "2026-01-01").ok).toBe(true);
    expect(checkBookingAllowed("PLANNER", [], "2026-12-01", "2026-01-01").ok).toBe(true);
    expect(checkBookingAllowed("OPERATION", [], "2026-12-01", "2026-01-01").ok).toBe(true);
  });
});

describe("currentWindow", () => {
  it("prefers the open window, then the next one", () => {
    expect(currentWindow([sep, aug], "2026-07-05")).toBe(aug);
    expect(currentWindow([sep, aug], "2026-07-20")).toBe(sep);
    expect(currentWindow([sep, aug], "2026-08-20")).toBeNull();
  });
});
