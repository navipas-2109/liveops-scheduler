// A brand's lives for a month can be confirmed and locked. Once locked, only
// Planners (and Managers) may change them.

import type { Role } from "./roles";

export function canChangeLocked(role: Role): boolean {
  return role === "PLANNER" || role === "MANAGER";
}

export const LOCKED_MESSAGE = "แบรนด์นี้ล็อกสล็อตเดือนนี้แล้ว — แก้ไขได้เฉพาะ Planner";
