import type { PaymentTab } from "@/application/payments/get-payment-page";
import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { PaymentView } from "./payment-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS: PaymentTab[] = ["toRecord", "pending", "approved", "locked", "all"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("payments");
  const params = await searchParams;

  const monthParam = one(params.month);
  const month =
    monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : services.today().slice(0, 7);
  const tabParam = one(params.tab) as PaymentTab | null;
  // Operation starts on what needs recording; Managers on what needs approving.
  const tab =
    tabParam && TABS.includes(tabParam) ? tabParam : user.role === "MANAGER" ? "pending" : "toRecord";

  const data = await services.getPaymentPage(user, { month, tab });
  return <PaymentView data={data} />;
}
