import type { SessionUser } from "../auth/login";
import { monthRange } from "../slots/get-brand-slot-page";
import type { ApprovalStatus, Clock, PaymentRepository, PaymentRow, PaymentSummary } from "../ports";

export type PaymentTab = "toRecord" | ApprovalStatus | "all";

export interface PaymentPageData {
  month: string;
  tab: PaymentTab;
  today: string;
  summary: PaymentSummary;
  rows: PaymentRow[];
  limit: number;
  canRecord: boolean;
  canApprove: boolean;
}

const LIMIT = 300;

export async function getPaymentPage(
  deps: { payments: PaymentRepository; clock: Clock },
  user: SessionUser,
  query: { month: string; tab: PaymentTab },
): Promise<PaymentPageData> {
  const { from, to } = monthRange(query.month);
  const now = { date: deps.clock.today(), minute: deps.clock.nowMinute() };
  const [summary, rows] = await Promise.all([
    deps.payments.summary(from, to, now),
    deps.payments.listRows({ from, to, endedBefore: now, tab: query.tab, limit: LIMIT }),
  ]);
  return {
    month: query.month,
    tab: query.tab,
    today: now.date,
    summary,
    rows,
    limit: LIMIT,
    canRecord: user.role === "OPERATION" || user.role === "MANAGER",
    canApprove: user.role === "MANAGER",
  };
}
