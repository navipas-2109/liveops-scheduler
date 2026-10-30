import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { ProducersView } from "./producers-view";

export default async function ProducersPage() {
  const user = await requirePage("producerDatabase");
  const producers = await services.listProducers();
  return <ProducersView producers={producers} canEdit={user.role === "OPERATION" || user.role === "MANAGER"} />;
}
