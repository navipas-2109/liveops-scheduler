import type { ScheduleView } from "@/application/slots/get-schedule-page";
import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { isValidIsoDate } from "@/domain/time";
import { ScheduleScreen } from "./schedule-screen";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const VIEWS: ScheduleView[] = ["month", "week", "day"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function SchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("schedule");
  const params = await searchParams;

  const viewParam = one(params.view) as ScheduleView | null;
  const dateParam = one(params.date);
  const data = await services.getSchedulePage(user, {
    view: viewParam && VIEWS.includes(viewParam) ? viewParam : "day",
    date: dateParam && isValidIsoDate(dateParam) ? dateParam : null,
    roomId: one(params.room),
  });
  return <ScheduleScreen data={data} role={user.role} userId={user.userId} />;
}
