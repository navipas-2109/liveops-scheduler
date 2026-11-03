import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { isValidIsoDate } from "@/domain/time";
import { ProducersView } from "../producers/producers-view";
import { StaffGridView } from "./staff-grid-view";
import { StaffTabs } from "./staff-toolbar";
import { StaffShiftView } from "./staff-shift-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function StaffShiftPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("staffShift");
  const params = await searchParams;
  const raw = one(params.date);
  const date = raw && isValidIsoDate(raw) ? raw : null;
  // Shifts are planned a month at a time, so the month view comes first.
  const view = one(params.view) ?? "month";

  if (view === "people") {
    const producers = await services.listProducers();
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
          <StaffTabs view="people" date={date} />
          <span className="text-[11px] text-muted">
            รายชื่ออัปเดตทุกเดือนเมื่อนำเข้าไฟล์กะ (ตำแหน่ง Squad Team รหัสพนักงาน) · เพิ่ม/แก้/ลบเองได้ที่นี่
          </span>
        </section>
        <ProducersView producers={producers} canEdit={["OPERATION", "PLANNER", "MANAGER"].includes(user.role)} />
      </div>
    );
  }
  const month = (date ?? services.today()).slice(0, 7);
  const shiftMonth = await services.getShiftMonth(month);

  if (view === "week" || view === "month") {
    return <StaffGridView data={await services.getStaffGrid(user, view, date)} shiftMonth={shiftMonth} />;
  }
  return <StaffShiftView data={await services.getStaffShiftPage(user, date)} shiftMonth={shiftMonth} />;
}
