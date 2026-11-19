import { NextResponse, type NextRequest } from "next/server";
import { canAccess } from "@/domain/roles";
import { SESSION_COOKIE, verifySessionToken } from "@/infrastructure/auth/session-token";
import { homeHref, navItemForPath } from "./app/navigation";

// Quick cookie-only check before any page renders: signed-out visitors go to
// /login, and people opening a page their role can't use go to their home page.
// Each page still checks the role itself (see require-page.ts).
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  // The MC queue page opens inside LINE; LINE identifies the MC, not our login.
  if (path === "/line" || path.startsWith("/line/")) return NextResponse.next();
  const user = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const redirectTo = (target: string) => NextResponse.redirect(new URL(target, req.nextUrl));

  if (!user) return path === "/login" ? NextResponse.next() : redirectTo("/login");
  if (path === "/login" || path === "/") return redirectTo(homeHref(user.role));

  const page = navItemForPath(path);
  if (page && !canAccess(user.role, page.id)) return redirectTo(homeHref(user.role));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
