"use client";

import {
  Building2,
  CalendarPlus,
  Radio,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Tag,
  UserRound,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SlotAlertCounts } from "@/application/ports";
import type { PageId } from "@/domain/roles";
import { logoutAction } from "../auth-actions";
import { BrandMark } from "../brand-mark";
import type { NavItem } from "../navigation";

const ICONS: Record<PageId, LucideIcon> = {
  dashboard: LayoutDashboard,
  brandSlots: Tag,
  mcPlanning: Mic,
  staffShift: Wrench,
  mcDatabase: UserRound,
  producerDatabase: UsersRound,
  payments: CreditCard,
  inputSlots: CalendarPlus,
  roomDatabase: Building2,
  channelDatabase: Radio,
};

interface Props {
  navItems: NavItem[];
  alerts: SlotAlertCounts;
}

// Desktop: fixed sidebar that can collapse to icons. Phone: slide-down menu
// opened from the top bar's menu button.
export function Sidebar({ navItems, alerts }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visible = navItems.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <aside
      className={`sticky top-0 z-30 flex shrink-0 flex-col border-line bg-panel md:h-screen md:border-r ${
        collapsed ? "md:w-[68px]" : "md:w-[244px]"
      }`}
    >
      <div
        className={`flex h-[60px] items-center justify-between gap-2 border-b border-line px-4 md:border-b-0 ${
          collapsed ? "md:h-auto md:flex-col md:py-3" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark size={26} />
          {!collapsed && (
            <>
              <span className="truncate text-[11px] font-semibold tracking-[0.2em] text-soft">
                LIVE OPS
              </span>
              <span className="rounded-full bg-primary px-1.5 py-[1px] text-[9px] font-bold tracking-wide text-white">
                BETA
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          className="hidden rounded-md p-1 text-muted hover:bg-card hover:text-soft md:block"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="เมนู"
          className="rounded-md border border-line-strong p-1.5 text-soft md:hidden"
        >
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      <div className={`${mobileOpen ? "flex" : "hidden"} min-h-0 flex-1 flex-col md:flex`}>
        {!collapsed && (
          <label className="mx-3 mb-3 mt-3 flex items-center gap-2 rounded-lg border border-line bg-field px-2.5 py-2 text-muted md:mt-0">
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted"
            />
          </label>
        )}

        {(alerts.conflict > 0 || alerts.waiting > 0) && (
          <div className={`mx-3 mb-3 flex flex-wrap gap-1.5 ${collapsed ? "md:flex-col" : ""}`}>
            {alerts.conflict > 0 && (
              <span className="rounded-md bg-conflict-bg px-2 py-1 text-[10px] font-semibold text-conflict-fg">
                ! {alerts.conflict} {collapsed ? "" : "Conflict"}
              </span>
            )}
            {alerts.waiting > 0 && (
              <span className="rounded-md bg-waiting-bg px-2 py-1 text-[10px] font-semibold text-waiting-fg">
                ? {alerts.waiting} {collapsed ? "" : "รอ MC"}
              </span>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {visible.map((item) => {
            const Icon = ICONS[item.id];
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.id}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                  active
                    ? "bg-primary/10 text-accent"
                    : "text-muted hover:bg-card hover:text-soft"
                } ${collapsed ? "md:justify-center md:px-0" : ""}`}
              >
                <Icon size={15} strokeWidth={2} className="shrink-0" />
                <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              title="ออกจากระบบ"
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-card hover:text-soft ${
                collapsed ? "md:justify-center md:px-0" : ""
              }`}
            >
              <LogOut size={15} />
              <span className={collapsed ? "md:hidden" : ""}>ออกจากระบบ</span>
            </button>
          </form>
          {!collapsed && (
            <p className="mt-3 text-center text-[9px] font-semibold tracking-[0.25em] text-muted/60">
              RIPPLES COMMERCE
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
