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
  | "brandSlots"
  | "mcPlanning"
  | "staffShift"
  | "mcDatabase"
  | "producerDatabase"
  | "payments"
  | "inputSlots"
  | "roomDatabase"
  | "channelDatabase";

export const PAGE_ACCESS: Record<PageId, Role[]> = {
  dashboard: ["MANAGER"],
  brandSlots: ["AE", "MANAGER"],
  mcPlanning: ["PLANNER", "MANAGER"],
  staffShift: ["OPERATION", "PLANNER", "MANAGER"],
  mcDatabase: ["PLANNER", "MANAGER"],
  producerDatabase: ["OPERATION", "MANAGER"],
  payments: ["OPERATION", "MANAGER"],
  inputSlots: ["OPERATION", "PLANNER", "MANAGER"],
  roomDatabase: ["OPERATION", "PLANNER", "MANAGER"],
  channelDatabase: ["OPERATION", "PLANNER", "MANAGER"],
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
