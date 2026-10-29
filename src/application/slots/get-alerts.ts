import type { SlotAlertCounts, SlotRepository } from "../ports";

// Counts shown in the sidebar: today's slots in conflict or still waiting for an MC.
export function getTodayAlerts(
  deps: { slots: SlotRepository },
  today: Date,
): Promise<SlotAlertCounts> {
  return deps.slots.countAlertsOn(today);
}
