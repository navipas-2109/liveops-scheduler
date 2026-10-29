import "server-only";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/application/auth/login";
import { canAccess, type PageId } from "@/domain/roles";
import { getSessionUser } from "@/infrastructure/auth/session";
import { homeHref } from "./navigation";

// Call at the top of every protected page. Sends signed-out visitors to the
// login page and people without access to their own home page.
export async function requirePage(page: PageId): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role, page)) redirect(homeHref(user.role));
  return user;
}
