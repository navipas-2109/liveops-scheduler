import { redirect } from "next/navigation";
import { services } from "@/di/container";
import { currentLiveDate } from "@/domain/time";
import { getSessionUser } from "@/infrastructure/auth/session";
import { navItemsFor } from "../navigation";
import { Sidebar } from "./sidebar";

// Every page here depends on the signed-in user, so it renders per request.
export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const alerts = await services.getTodayAlerts(currentLiveDate());

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar user={user} navItems={navItemsFor(user.role)} alerts={alerts} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
