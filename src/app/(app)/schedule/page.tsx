import { requirePage } from "@/app/require-page";
import { PagePlaceholder } from "../page-placeholder";

export default async function Page() {
  await requirePage("schedule");
  return <PagePlaceholder title="ระบบตารางไลฟ์ (Live Scheduling System)" description="AE ลงสล็อตแบรนด์ → Planner ลง MC → ระบบดึงทีมงานอัตโนมัติ" />;
}
