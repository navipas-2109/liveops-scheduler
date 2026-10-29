import { requirePage } from "@/app/require-page";
import { PagePlaceholder } from "../page-placeholder";

export default async function Page() {
  await requirePage("mcDatabase");
  return <PagePlaceholder title="MC Database" description="รายชื่อ MC ทั้งหมด พร้อมเรทและประวัติไลฟ์" />;
}
