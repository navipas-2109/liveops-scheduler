import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { ChannelsView } from "./channels-view";

export default async function ChannelsPage() {
  await requirePage("channelDatabase");
  const brands = await services.listBrands();
  return <ChannelsView brands={brands} />;
}
