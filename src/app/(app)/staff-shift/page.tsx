import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { isValidIsoDate } from "@/domain/time";
import { StaffGridView } from "./staff-grid-view";
import { StaffShiftView } from "./staff-shift-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function StaffShiftPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("staffShift");
  const params = await searchParams;
  const raw = one(params.date);
  const date = raw && isValidIsoDate(raw) ? raw : null;
  const view = one(params.view);
  const month = (date ?? services.today()).slice(0, 7);
  const shiftMonth = await services.getShiftMonth(month);

  if (view === "week" || view === "month") {
    return <StaffGridView data={await services.getStaffGrid(user, view, date)} shiftMonth={shiftMonth} />;
  }
  return <StaffShiftView data={await services.getStaffShiftPage(user, date)} shiftMonth={shiftMonth} />;
}
