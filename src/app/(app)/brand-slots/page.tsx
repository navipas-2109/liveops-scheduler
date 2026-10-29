import { requirePage } from "@/app/require-page";
import { PagePlaceholder } from "../page-placeholder";

export default async function Page() {
  await requirePage("brandSlots");
  return <PagePlaceholder title="Brand Slot" description="AE ลงสล็อตแบรนด์ภายในช่วง Booking Window" />;
}
