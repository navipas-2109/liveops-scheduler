import { canAccess, HOME_PAGE, type PageId, type Role } from "@/domain/roles";

export interface NavItem {
  id: PageId;
  href: string;
  label: string;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard", description: "สรุปภาพรวมประจำวัน" },
  {
    id: "schedule",
    href: "/schedule",
    label: "Live Schedule",
    description: "ตารางไลฟ์แยกตามห้อง กรองแบรนด์/Channel ได้",
  },
  {
    id: "inputSlots",
    href: "/input-slots",
    label: "Input Live Slot",
    description: "ลงสล็อตไลฟ์ตาม PD และยืนยัน/ล็อกสล็อตของแต่ละแบรนด์",
  },
  {
    id: "staffShift",
    href: "/staff-shift",
    label: "Producer Shift",
    description: "กะของ Producer และจำนวนสล็อตในแต่ละวัน",
  },
  {
    id: "producerDatabase",
    href: "/producers",
    label: "Producer Database",
    description: "เพิ่ม/ลบ/แก้ไขพนักงาน",
  },
  { id: "roomDatabase", href: "/rooms", label: "Room Database", description: "เพิ่ม/ลบ/แก้ไขห้องไลฟ์" },
  {
    id: "channelDatabase",
    href: "/channels",
    label: "Channel Database",
    description: "แบรนด์และ Channel (Platform) ที่ไลฟ์",
  },
  {
    id: "brandSlots",
    href: "/brand-slots",
    label: "Brand Slot (AE)",
    description: "AE ลงสล็อตแบรนด์ภายในช่วง Booking Window",
  },
  {
    id: "mcPlanning",
    href: "/mc-planning",
    label: "MC Planning",
    description: "ลง MC ให้แต่ละสล็อต และตรวจสอบคิวชน",
  },
  {
    id: "mcDatabase",
    href: "/mcs",
    label: "MC Database",
    description: "รายชื่อ MC ทั้งหมด พร้อมเรทและประวัติไลฟ์",
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
