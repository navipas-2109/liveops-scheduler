import { rangesOverlap } from "@/domain/time";
import type { SlotRepository } from "../ports";

export interface RoomClash {
  slotId: string;
  startMinute: number;
  endMinute: number;
  brandId: string;
  brandName: string;
  pdNames: string[];
}

// Live check for the Add Slot form: which bookings in this room overlap the
// chosen time. Saving checks again, so this is only a preview.
export async function checkRoomAvailability(
  deps: { slots: SlotRepository },
  query: { date: string; roomId: string; startMinute: number; endMinute: number; excludeId?: string },
): Promise<RoomClash[]> {
  const sameDay = await deps.slots.list({ from: query.date, to: query.date });
  return sameDay
    .filter((s) => s.id !== query.excludeId && s.roomId === query.roomId && rangesOverlap(query, s))
    .map((s) => ({
      slotId: s.id,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
      brandId: s.brandId,
      brandName: `${s.brandName} (${s.platform})`,
      pdNames: [s.producerName, s.admin1Name].filter((n): n is string => !!n),
    }));
}
