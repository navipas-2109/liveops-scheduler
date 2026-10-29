import { requirePage } from "@/app/require-page";
import { PagePlaceholder } from "../page-placeholder";

export default async function Page() {
  await requirePage("payments");
  return <PagePlaceholder title="Payment Tracking" description="บันทึกเวลาไลฟ์จริง คำนวณค่า MC และอนุมัติจ่าย" />;
}
