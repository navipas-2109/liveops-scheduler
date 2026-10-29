import { Plus } from "lucide-react";
import type { Room, SlotListItem } from "@/application/ports";
import { fromLiveMinutes } from "@/domain/time";
import { dayLabel, timeRange } from "../../format";
import { assignLanes, BLOCK_STYLE, HOURS, place } from "./schedule-shared";

interface Props {
  date: string;
  rooms: Room[];
  slots: SlotListItem[];
  colors: Record<string, string>;
  selectedId: string | null;
  onSelect: (slot: SlotListItem) => void;
  onAdd: ((roomId: string, minute: number) => void) | null;
}

const LANE_HEIGHT = 34;

// One row per room (name stays visible while scrolling sideways), hours
// 07:00–02:00 across. Slots span their real length.
export function DayTimeline({ date, rooms, slots, colors, selectedId, onSelect, onAdd }: Props) {
  const byRoom = new Map<string, SlotListItem[]>();
  for (const s of slots) byRoom.set(s.roomId, [...(byRoom.get(s.roomId) ?? []), s]);

  return (
    <section className="rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">
          {dayLabel(date)} <span className="font-normal text-muted">· {slots.length} สล็อต</span>
        </h2>
        {onAdd && <p className="text-[11px] text-muted">คลิกช่องว่างเพื่อเพิ่มสล็อต</p>}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          <div className="flex border-y border-line text-[10px] font-medium text-muted">
            <div className="sticky left-0 z-20 w-[190px] shrink-0 bg-card px-3 py-1.5">ห้อง</div>
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}>
              {HOURS.map((h) => (
                <div key={h} className="border-l border-line/60 px-1 py-1.5">
                  {fromLiveMinutes(h)}
                </div>
              ))}
            </div>
          </div>

          {rooms.map((room) => {
            const lanes = assignLanes(byRoom.get(room.id) ?? []);
            const height = Math.max(lanes.length, 1) * LANE_HEIGHT + 6;
            return (
              <div key={room.id} className="flex border-b border-line/60">
                <div
                  className="sticky left-0 z-20 flex w-[190px] shrink-0 flex-col justify-center border-l-[3px] bg-card px-3 text-[11px]"
                  style={{ borderLeftColor: colors[room.id] }}
                >
                  <span className="truncate font-medium text-soft">{room.shortName}</span>
                  <span className="text-[10px] text-muted">
                    {room.building} F{room.floor} · {room.size}
                  </span>
                </div>
                <div className="relative flex-1" style={{ height }}>
                  {/* Hour grid underneath: empty hours are clickable when booking is allowed */}
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}>
                    {HOURS.map((h) =>
                      onAdd ? (
                        <button
                          key={h}
                          type="button"
                          onClick={() => onAdd(room.id, h)}
                          aria-label={`เพิ่มสล็อต ${room.shortName} ${fromLiveMinutes(h)}`}
                          className="group flex items-center justify-center border-l border-line/40 hover:bg-primary/10"
                        >
                          <Plus size={12} className="text-accent opacity-0 group-hover:opacity-100" />
                        </button>
                      ) : (
                        <div key={h} className="border-l border-line/40" />
                      ),
                    )}
                  </div>
                  {lanes.map((lane, i) =>
                    lane.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelect(s)}
                        title={`${s.brandName} (${s.platform}) ${timeRange(s.startMinute, s.endMinute)}`}
                        className={`absolute z-10 overflow-hidden rounded-md border-l-[3px] px-1.5 text-left text-[10px] leading-tight ${BLOCK_STYLE[s.status]} ${
                          selectedId === s.id ? "outline outline-2 outline-accent" : ""
                        }`}
                        style={{
                          ...place(s.startMinute, s.endMinute),
                          top: 3 + i * LANE_HEIGHT,
                          height: LANE_HEIGHT - 4,
                          borderLeftColor: colors[s.roomId],
                        }}
                      >
                        <span className="block truncate font-semibold">{s.brandName}</span>
                        <span className="block truncate opacity-80">
                          {timeRange(s.startMinute, s.endMinute)} · {s.mcName ?? "รอ MC"}
                        </span>
                      </button>
                    )),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
