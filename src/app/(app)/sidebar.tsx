"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/application/auth/login";
import type { SlotAlertCounts } from "@/application/ports";
import { ROLE_LABEL } from "@/domain/roles";
import { logoutAction } from "../auth-actions";
import type { NavItem } from "../navigation";

interface Props {
  user: SessionUser;
  navItems: NavItem[];
  alerts: SlotAlertCounts;
}

// Fixed dark sidebar on desktop; on phones it collapses into a top bar
// with a menu button.
export function Sidebar({ user, navItems, alerts }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <aside className="sticky top-0 z-20 flex shrink-0 flex-col bg-sidebar text-[#ccc] md:h-screen md:w-[200px] md:overflow-y-auto">
      <div className="flex items-center justify-between border-b border-sidebar-line px-4 py-3 md:block md:pb-2.5 md:pt-3.5">
        <div className="flex items-center gap-2 md:mb-2.5">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-accent text-[13px]">
            📡
          </div>
          <span className="text-[13px] font-semibold text-white">LIVE OPS</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="เมนู"
          className="rounded-md border border-sidebar-control-line bg-sidebar-control px-2.5 py-1 text-xs text-[#ddd] md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>

        <div className="hidden md:block">
          <UserBox user={user} alerts={alerts} />
        </div>
      </div>

      <div className={`${open ? "flex" : "hidden"} flex-1 flex-col md:flex`}>
        <div className="border-b border-sidebar-line px-4 py-2.5 md:hidden">
          <UserBox user={user} alerts={alerts} />
        </div>
        <nav className="flex-1 py-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 border-l-2 px-4 py-[7px] text-xs ${
                  active
                    ? "border-accent bg-[#2563EB22] text-sidebar-active"
                    : "border-transparent text-sidebar-text hover:text-[#cfd5e0]"
                }`}
              >
                <span className={`text-[13px] ${active ? "" : "opacity-70"}`}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="border-t border-sidebar-line px-4 py-3">
          <button
            type="submit"
            className="w-full rounded-md border border-sidebar-control-line bg-sidebar-control px-2 py-1.5 text-[11px] text-[#ddd] hover:bg-[#33405a]"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
    </aside>
  );
}

function UserBox({ user, alerts }: { user: SessionUser; alerts: SlotAlertCounts }) {
  return (
    <>
      <div className="rounded-[5px] border border-sidebar-control-line bg-sidebar-control px-2 py-1.5">
        <p className="truncate text-[11px] text-[#ddd]">{user.name}</p>
        <p className="text-[10px] text-sidebar-text">{ROLE_LABEL[user.role]}</p>
      </div>
      {(alerts.conflict > 0 || alerts.waiting > 0) && (
        <div className="mt-2 rounded-md bg-conflict-alert-bg px-2 py-1.5">
          {alerts.conflict > 0 && (
            <p className="text-[10px] text-conflict-alert-fg">! {alerts.conflict} Conflict</p>
          )}
          {alerts.waiting > 0 && (
            <p className="text-[10px] text-waiting-alert-fg">? {alerts.waiting} รอ MC</p>
          )}
        </div>
      )}
    </>
  );
}
