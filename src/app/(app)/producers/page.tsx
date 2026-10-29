import { requirePage } from "@/app/require-page";
import { PagePlaceholder } from "../page-placeholder";

export default async function Page() {
  await requirePage("producerDatabase");
  return <PagePlaceholder title="Producer Database" description="รายชื่อ Producer ทั้งหมด พร้อมประวัติกะ" />;
}
