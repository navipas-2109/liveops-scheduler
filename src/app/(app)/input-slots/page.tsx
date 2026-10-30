import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { isValidIsoDate } from "@/domain/time";
import { InputScreen } from "./input-screen";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InputSlotsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("inputSlots");
  const raw = (await searchParams).date;
  const date = Array.isArray(raw) ? raw[0] : raw;
  const data = await services.getInputPage(user, date && isValidIsoDate(date) ? date : null);
  return <InputScreen data={data} />;
}
