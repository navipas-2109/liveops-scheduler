import { canAccess, HOME_PAGE, type PageId, type Role } from "@/domain/roles";

export interface NavItem {
  id: PageId;
  href: string;
  icon: string;
  label: string;
}

// Order, icons and labels follow the prototype sidebar.
export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", href: "/dashboard", icon: "📊", label: "Dashboard" },
  { id: "schedule", href: "/schedule", icon: "📅", label: "Live Schedule View" },
  { id: "brandSlots", href: "/brand-slots", icon: "🏷️", label: "Brand Slot (AE)" },
  { id: "mcPlanning", href: "/mc-planning", icon: "🎙️", label: "MC Planning (Planner)" },
  { id: "staffShift", href: "/staff-shift", icon: "🔧", label: "Staff Shift (Admin)" },
  { id: "mcDatabase", href: "/mcs", icon: "👤", label: "MC Database" },
  { id: "producerDatabase", href: "/producers", icon: "👥", label: "Producer Database" },
  { id: "payments", href: "/payments", icon: "💳", label: "Payment Tracking" },
];

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(role, item.id));
}

export function homeHref(role: Role): string {
  return NAV_ITEMS.find((item) => item.id === HOME_PAGE[role])!.href;
}
