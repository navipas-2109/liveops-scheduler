import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import type { SlotStatus } from "@/domain/slot-rules";
import { isValidIsoDate } from "@/domain/time";
import { STATUS_ORDER } from "../../format";
import { McPlanningView } from "./mc-planning-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function McPlanningPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("mcPlanning");
  const params = await searchParams;

  const monthParam = one(params.month);
  const month =
    monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : services.today().slice(0, 7);
  const dayParam = one(params.day);
  // Planners mostly work on slots still waiting for an MC, so that's the default.
  const statusParam = one(params.status) ?? "waiting";
  const status = STATUS_ORDER.includes(statusParam as SlotStatus) ? (statusParam as SlotStatus) : null;

  const data = await services.getMcPlanningPage(user, {
    month,
    day: dayParam && isValidIsoDate(dayParam) ? dayParam : null,
    status,
  });
  return <McPlanningView data={data} />;
}
