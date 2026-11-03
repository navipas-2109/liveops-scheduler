import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { McSheetView } from "./mc-sheet-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function McSheetPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("mcSheet");
  const monthParam = one((await searchParams).month);
  const month =
    monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : services.today().slice(0, 7);
  const data = await services.getMcSheetPage(user, month);
  return <McSheetView data={data} />;
}
