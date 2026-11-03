// Who may open which page, and where each role lands after logging in.

export type Role = "AE" | "PLANNER" | "OPERATION" | "MANAGER" | "MC";

export const ROLE_LABEL: Record<Role, string> = {
  AE: "AE",
  PLANNER: "Planner",
  OPERATION: "Operation",
  MANAGER: "Manager",
  MC: "MC",
};

export type PageId =
  | "dashboard"
  | "schedule"
  | "brandSlots"
  | "mcPlanning"
  | "staffShift"
  | "mcDatabase"
  | "producerDatabase"
  | "payments"
  | "inputSlots"
  | "roomDatabase"
  | "channelDatabase"
  | "mcSheet"
  | "brandCheck";

// Office staff; MCs only see their own lives on the MC Slot Sheet.
const ALL_ROLES: Role[] = ["AE", "PLANNER", "OPERATION", "MANAGER"];

export const PAGE_ACCESS: Record<PageId, Role[]> = {
  dashboard: ["MANAGER"],
  schedule: ALL_ROLES,
  brandSlots: ["AE", "MANAGER"],
  mcPlanning: ["PLANNER", "MANAGER"],
  staffShift: ["OPERATION", "PLANNER", "MANAGER"],
  mcDatabase: ["PLANNER", "MANAGER"],
  producerDatabase: ["OPERATION", "PLANNER", "MANAGER"],
  payments: ["OPERATION", "MANAGER"],
  inputSlots: ["AE", "OPERATION", "PLANNER", "MANAGER"],
  roomDatabase: ["OPERATION", "PLANNER", "MANAGER"],
  channelDatabase: ["OPERATION", "PLANNER", "MANAGER"],
  mcSheet: ["AE", "PLANNER", "MANAGER", "MC"],
  brandCheck: ["AE", "OPERATION", "PLANNER", "MANAGER"],
};

export const HOME_PAGE: Record<Role, PageId> = {
  AE: "inputSlots",
  PLANNER: "mcPlanning",
  OPERATION: "staffShift",
  MANAGER: "dashboard",
  MC: "mcSheet",
};

export function canAccess(role: Role, page: PageId): boolean {
  return PAGE_ACCESS[page].includes(role);
}
