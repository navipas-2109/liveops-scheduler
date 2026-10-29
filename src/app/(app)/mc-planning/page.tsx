import { requirePage } from "@/app/require-page";
import { PagePlaceholder } from "../page-placeholder";

export default async function Page() {
  await requirePage("mcPlanning");
  return <PagePlaceholder title="MC Planning" description="Planner ลง MC ให้แต่ละสล็อต และตรวจสอบคิวชน" />;
}
