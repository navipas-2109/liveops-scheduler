// Brand Slot Check: per brand and month, the hours booked against the
// Planner's plan. Planner sets the plan and approves; the AE then confirms.

import type { SessionUser } from "../auth/login";
import { bandMinutes, checkStatus, totalMinutes, type CheckStatus } from "@/domain/brand-check";
import type {
  BrandPlanRepository,
  BrandRepository,
  Clock,
  SlotLock,
  SlotLockRepository,
  SlotListItem,
  SlotRepository,
} from "../ports";
import { monthRange } from "../slots/get-brand-slot-page";

type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

export const PLANNERS = ["PLANNER", "MANAGER"];
export const CONFIRMERS = ["AE", "OPERATION", "PLANNER", "MANAGER"];

export interface BrandCheckRow {
  brandId: string;
  brandName: string;
  platform: string;
  aeNames: string[];
  planMinutes: number | null;
  remark: string;
  inputMinutes: number;
  bands: number[];
  slotCount: number;
  approvedByName: string | null;
  lock: SlotLock | null;
  status: CheckStatus;
}

export interface BrandCheckPageData {
  month: string;
  rows: BrandCheckRow[];
  canPlan: boolean;
  canConfirm: boolean;
}

type CheckDeps = {
  brands: BrandRepository;
  slots: SlotRepository;
  plans: BrandPlanRepository;
  locks: SlotLockRepository;
};

async function monthSlots(deps: { slots: SlotRepository }, month: string): Promise<SlotListItem[]> {
  const { from, to } = monthRange(month);
  return deps.slots.list({ from, to });
}

export async function buildRows(deps: CheckDeps, user: SessionUser, month: string): Promise<BrandCheckRow[]> {
  const [brands, slots, plans, locks] = await Promise.all([
    user.role === "AE" ? deps.brands.listForAe(user.userId) : deps.brands.listAll(),
    monthSlots(deps, month),
    deps.plans.listForMonth(month),
    deps.locks.listForMonth(month),
  ]);
  const planOf = new Map(plans.map((p) => [p.brandId, p]));
  const lockOf = new Map(locks.map((l) => [l.brandId, l]));
  return brands.map((b) => {
    const mine = slots.filter((s) => s.brandId === b.id);
    const plan = planOf.get(b.id) ?? null;
    const lock = lockOf.get(b.id) ?? null;
    const inputMinutes = totalMinutes(mine);
    return {
      brandId: b.id,
      brandName: b.brandName,
      platform: b.platform,
      aeNames: [...new Set(mine.map((s) => s.aeName))].sort(),
      planMinutes: plan?.planMinutes ?? null,
      remark: plan?.remark ?? "",
      inputMinutes,
      bands: bandMinutes(mine),
      slotCount: mine.length,
      approvedByName: plan?.approvedByName ?? null,
      lock,
      status: checkStatus({
        planMinutes: plan?.planMinutes ?? null,
        inputMinutes,
        approved: !!plan?.approvedByName,
        locked: !!lock,
      }),
    };
  });
}

export async function getBrandCheckPage(
  deps: CheckDeps & { clock: Clock },
  user: SessionUser,
  month: string,
): Promise<BrandCheckPageData> {
  return {
    month,
    rows: await buildRows(deps, user, month),
    canPlan: PLANNERS.includes(user.role),
    canConfirm: CONFIRMERS.includes(user.role),
  };
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function setPlan(
  deps: { plans: BrandPlanRepository; locks: SlotLockRepository },
  user: SessionUser,
  brandId: string,
  month: string,
  hours: number,
  remark: string,
): Promise<Result> {
  if (!PLANNERS.includes(user.role)) return { ok: false, error: "ใส่ Plan ได้เฉพาะ Planner" };
  if (!MONTH.test(month)) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  if (!Number.isFinite(hours) || hours < 0 || hours > 5000 || Math.round(hours * 2) !== hours * 2) {
    return { ok: false, error: "จำนวนชั่วโมงต้องเป็น 0 ขึ้นไป ทีละครึ่งชั่วโมง" };
  }
  if (remark.length > 200) return { ok: false, error: "หมายเหตุยาวเกินไป" };
  if (await deps.locks.isLocked(brandId, month)) return { ok: false, error: "แบรนด์นี้ยืนยันแล้ว — ปลดล็อกก่อนแก้ Plan" };
  await deps.plans.setPlan(brandId, month, Math.round(hours * 60), remark.trim());
  return { ok: true, value: undefined };
}

// Planner approves once the booked hours match the plan.
export async function approvePlan(
  deps: CheckDeps,
  user: SessionUser,
  brandId: string,
  month: string,
  approve: boolean,
): Promise<Result> {
  if (!PLANNERS.includes(user.role)) return { ok: false, error: "Approve ได้เฉพาะ Planner" };
  if (!MONTH.test(month)) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  if (approve) {
    const row = (await buildRows(deps, user, month)).find((r) => r.brandId === brandId);
    if (!row) return { ok: false, error: "ไม่พบแบรนด์นี้" };
    if (row.status !== "awaiting_approval" && row.status !== "ready") {
      return { ok: false, error: "Approve ได้เมื่อชั่วโมงที่ลงตรงกับ Plan แล้ว" };
    }
  }
  await deps.plans.setApproved(brandId, month, approve ? user.userId : null);
  return { ok: true, value: undefined };
}

// The AE confirms every brand that's ready, in one go.
export async function confirmReady(deps: CheckDeps, user: SessionUser, month: string): Promise<Result<number>> {
  if (!CONFIRMERS.includes(user.role)) return { ok: false, error: "คุณไม่มีสิทธิ์ยืนยันสล็อต" };
  if (!MONTH.test(month)) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  const ready = (await buildRows(deps, user, month)).filter((r) => r.status === "ready");
  for (const r of ready) await deps.locks.lock(r.brandId, month, user.userId);
  return { ok: true, value: ready.length };
}
