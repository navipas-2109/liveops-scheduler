import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { liffUrl } from "@/infrastructure/line/line-gateway";
import { LineMcView } from "./line-mc-view";

export default async function LineMcPage() {
  const user = await requirePage("lineMc");
  const data = await services.getLineMcPage(user);
  return <LineMcView data={data} liffUrl={liffUrl()} />;
}
