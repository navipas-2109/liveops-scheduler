import { describe, expect, it } from "vitest";
import { bandMinutes, checkStatus, totalMinutes } from "./brand-check";
import { toLiveMinutes as t } from "./time";

const live = (a: string, b: string) => ({ startMinute: t(a), endMinute: t(b) });

describe("brand slot check", () => {
  it("splits hours into the time bands", () => {
    const slots = [live("07:30", "09:30"), live("10:00", "12:00"), live("19:30", "21:30"), live("22:30", "00:30")];
    expect(bandMinutes(slots)).toEqual([150, 90, 0, 120, 120]);
    expect(totalMinutes(slots)).toBe(480);
  });

  it("only a matching, approved brand is ready to confirm", () => {
    const base = { planMinutes: 600, inputMinutes: 600, approved: false, locked: false };
    expect(checkStatus({ ...base, planMinutes: null })).toBe("no_plan");
    expect(checkStatus({ ...base, inputMinutes: 480 })).toBe("short");
    expect(checkStatus({ ...base, inputMinutes: 720 })).toBe("over");
    expect(checkStatus(base)).toBe("awaiting_approval");
    expect(checkStatus({ ...base, approved: true })).toBe("ready");
    expect(checkStatus({ ...base, locked: true, inputMinutes: 0 })).toBe("confirmed");
  });
});
