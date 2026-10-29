import type { Room, SlotListItem } from "@/application/ports";
import { fromLiveMinutes, LIVE_DAY_END, LIVE_DAY_START } from "@/domain/time";
import { dayLabel, timeRange } from "../../format";

interface Props {
  day: string;
  rooms: Room[];
  slots: SlotListItem[];
  canBook: boolean;
  onPickFree: (roomId: string, startMinute: number) => void;
}

const HOURS: number[] = [];
for (let m = LIVE_DAY_START; m < LIVE_DAY_END; m += 60) HOURS.push(m);

// One row per room, one column per hour (07:00–02:00). Green = free, grey = booked.
export function RoomHeatmap({ day, rooms, slots, canBook, onPickFree }: Props) {
  const byRoom = new Map<string, SlotListItem[]>();
  for (const s of slots) byRoom.set(s.roomId, [...(byRoom.get(s.roomId) ?? []), s]);

  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">ห้องว่าง · {dayLabel(day)}</h2>
          <p className="text-[11px] text-muted">
            {canBook ? "คลิกช่องสีเขียวเพื่อจองห้องนั้น" : "ดูอย่างเดียว — Booking Window ปิดอยู่"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-soft">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#1b4a2f]" /> ว่าง
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#3d4b66]" /> จองแล้ว
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[2px] text-[10px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[150px] bg-card pr-2 text-left font-semibold text-muted">
                ห้อง
              </th>
              {HOURS.map((h) => (
                <th key={h} className="min-w-[34px] font-medium text-muted">
                  {fromLiveMinutes(h).slice(0, 2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const booked = byRoom.get(room.id) ?? [];
              return (
                <tr key={room.id}>
                  <th
                    scope="row"
                    title={`${room.building} F${room.floor} · ${room.size}`}
                    className="sticky left-0 z-10 max-w-[180px] truncate bg-card pr-2 text-left font-medium text-soft"
                  >
                    <span className="text-muted">{room.building === "Witree" ? "WT" : "RS"} F{room.floor} · </span>
                    {room.shortName}
                  </th>
                  {HOURS.map((h) => {
                    const slot = booked.find((s) => s.startMinute < h + 60 && h < s.endMinute);
                    if (slot) {
                      return (
                        <td
                          key={h}
                          title={`${slot.brandName} (${slot.platform}) ${timeRange(slot.startMinute, slot.endMinute)}`}
                          className="h-6 rounded-sm bg-[#3d4b66]"
                        />
                      );
                    }
                    return (
                      <td key={h} className="h-6 p-0">
                        <button
                          type="button"
                          disabled={!canBook}
                          onClick={() => onPickFree(room.id, h)}
                          aria-label={`จอง ${room.shortName} ${fromLiveMinutes(h)}`}
                          className="block h-6 w-full rounded-sm bg-[#1b4a2f] transition enabled:hover:bg-[#2f8a55] disabled:cursor-default"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
