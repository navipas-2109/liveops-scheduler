import type { Clock, SlotAlertCounts, SlotRepository } from "../ports";

// Counts shown in the sidebar: today's slots in conflict or still waiting for an MC.
export function getTodayAlerts(deps: { slots: SlotRepository; clock: Clock }): Promise<SlotAlertCounts> {
  return deps.slots.countAlertsOn(deps.clock.today());
}
