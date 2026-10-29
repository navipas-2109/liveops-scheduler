import { canAccess, HOME_PAGE, type PageId, type Role } from "@/domain/roles";

export interface NavItem {
  id: PageId;
  href: string;
  label: string;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    description: "สรุปภาพรวมประจำวัน",
  },
  {
    id: "schedule",
    href: "/schedule",
    label: "Live Schedule",
    description: "ตารางไลฟ์ทุกห้อง รายเดือน / สัปดาห์ / วัน",
  },
  {
    id: "brandSlots",
    href: "/brand-slots",
    label: "Brand Slot",
    description: "AE ลงสล็อตแบรนด์ภายในช่วง Booking Window",
  },
  {
    id: "mcPlanning",
    href: "/mc-planning",
    label: "MC Planning",
    description: "ลง MC ให้แต่ละสล็อต และตรวจสอบคิวชน",
  },
  {
    id: "staffShift",
    href: "/staff-shift",
    label: "Staff Shift",
    description: "กะทำงานของ Producer และความพร้อมก่อนไลฟ์",
  },
  {
    id: "mcDatabase",
    href: "/mcs",
    label: "MC Database",
    description: "รายชื่อ MC ทั้งหมด พร้อมเรทและประวัติไลฟ์",
  },
  {
    id: "producerDatabase",
    href: "/producers",
    label: "Producer Database",
    description: "รายชื่อ Producer ทั้งหมด พร้อมประวัติกะ",
  },
  {
    id: "payments",
    href: "/payments",
    label: "Payment Tracking",
    description: "บันทึกเวลาไลฟ์จริง คำนวณค่า MC และอนุมัติจ่าย",
  },
];

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(role, item.id));
}

export function navItemForPath(path: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => path === item.href || path.startsWith(item.href + "/"));
}

export function homeHref(role: Role): string {
  return NAV_ITEMS.find((item) => item.id === HOME_PAGE[role])!.href;
}
