// Who may open which page, and where each role lands after logging in.

export type Role = "AE" | "PLANNER" | "OPERATION" | "MANAGER";

export const ROLE_LABEL: Record<Role, string> = {
  AE: "AE",
  PLANNER: "Planner",
  OPERATION: "Operation",
  MANAGER: "Manager",
};

export type PageId =
  | "dashboard"
  | "schedule"
  | "brandSlots"
  | "mcPlanning"
  | "staffShift"
  | "mcDatabase"
  | "producerDatabase"
  | "payments";

const ALL_ROLES: Role[] = ["AE", "PLANNER", "OPERATION", "MANAGER"];

export const PAGE_ACCESS: Record<PageId, Role[]> = {
  dashboard: ["MANAGER"],
  schedule: ALL_ROLES,
  brandSlots: ["AE", "MANAGER"],
  mcPlanning: ["PLANNER", "MANAGER"],
  staffShift: ["OPERATION", "MANAGER"],
  mcDatabase: ["PLANNER", "MANAGER"],
  producerDatabase: ["OPERATION", "MANAGER"],
  payments: ["OPERATION", "MANAGER"],
};

export const HOME_PAGE: Record<Role, PageId> = {
  AE: "brandSlots",
  PLANNER: "mcPlanning",
  OPERATION: "staffShift",
  MANAGER: "dashboard",
};

export function canAccess(role: Role, page: PageId): boolean {
  return PAGE_ACCESS[page].includes(role);
}
