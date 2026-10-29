"use client";

import { ChevronRight, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/application/auth/login";
import { ROLE_LABEL } from "@/domain/roles";
import { navItemForPath } from "../navigation";

// Breadcrumb and page title on the left, signed-in user on the right.
export function TopBar({ user, homeHref }: { user: SessionUser; homeHref: string }) {
  const page = navItemForPath(usePathname());
  const initials = user.name.trim().slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-page/90 backdrop-blur">
      <div className="h-[2px] bg-gradient-to-r from-primary via-accent to-violet" />
      <div className="flex min-h-[58px] items-center justify-between gap-4 px-4 py-2 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={homeHref}
            aria-label="หน้าแรก"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-strong text-accent hover:bg-card sm:flex"
          >
            <House size={15} />
          </Link>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] text-muted">
              Home
              {page && (
                <>
                  <ChevronRight size={10} />
                  {page.label}
                </>
              )}
            </p>
            <h1 className="truncate text-[15px] font-semibold text-ink">
              {page?.label ?? "LiveOps Scheduler"}
              {page && (
                <span className="ml-2 hidden text-[11px] font-normal text-muted lg:inline">
                  · {page.description}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-ink">{user.name}</p>
            <p className="text-[10px] text-muted">{ROLE_LABEL[user.role]}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-xs font-bold text-white">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
