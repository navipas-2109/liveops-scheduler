import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { isValidIsoDate } from "@/domain/time";
import { StaffShiftView } from "./staff-shift-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StaffShiftPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("staffShift");
  const raw = (await searchParams).date;
  const date = Array.isArray(raw) ? raw[0] : raw;
  const data = await services.getStaffShiftPage(user, date && isValidIsoDate(date) ? date : null);
  return <StaffShiftView data={data} />;
}
