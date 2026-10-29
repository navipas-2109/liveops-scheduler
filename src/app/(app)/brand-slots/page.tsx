import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import type { SlotStatus } from "@/domain/slot-rules";
import { isValidIsoDate } from "@/domain/time";
import { STATUS_ORDER } from "../../format";
import { BrandSlotView } from "./brand-slot-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function BrandSlotsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("brandSlots");
  const params = await searchParams;

  const today = services.today();
  const monthParam = one(params.month);
  const dayParam = one(params.day);
  const statusParam = one(params.status);
  const month =
    monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : today.slice(0, 7);

  const data = await services.getBrandSlotPage(user, {
    month,
    day: dayParam && isValidIsoDate(dayParam) ? dayParam : null,
    brandName: one(params.brand),
    status: STATUS_ORDER.includes(statusParam as SlotStatus) ? (statusParam as SlotStatus) : null,
  });

  return (
    <BrandSlotView
      data={data}
      role={user.role}
      userId={user.userId}
      filters={{ brand: one(params.brand), status: statusParam }}
    />
  );
}
