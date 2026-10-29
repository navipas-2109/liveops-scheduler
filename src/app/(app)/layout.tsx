import { redirect } from "next/navigation";
import { services } from "@/di/container";
import { getSessionUser } from "@/infrastructure/auth/session";
import { homeHref, navItemsFor } from "../navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

// Every page here depends on the signed-in user, so it renders per request.
export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const alerts = await services.getTodayAlerts();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar navItems={navItemsFor(user.role)} alerts={alerts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} homeHref={homeHref(user.role)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
