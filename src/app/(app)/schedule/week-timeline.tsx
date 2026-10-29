import Link from "next/link";
import type { SlotListItem } from "@/application/ports";
import { fromIsoDate, fromLiveMinutes, toIsoDate } from "@/domain/time";
import { dayLabel, timeRange } from "../../format";
import { assignLanes, BLOCK_STYLE, HOURS, place } from "./schedule-shared";

interface Props {
  from: string;
  today: string;
  slots: SlotListItem[];
  colors: Record<string, string>;
  onSelect: (slot: SlotListItem) => void;
  dayHref: (date: string) => string;
}

const LANE_HEIGHT = 26;

// One row per day, hours across; overlapping slots stack in lanes.
export function WeekTimeline({ from, today, slots, colors, onSelect, dayHref }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = fromIsoDate(from);
    d.setUTCDate(d.getUTCDate() + i);
    return toIsoDate(d);
  });

  return (
    <section className="rounded-xl border border-line bg-card">
      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          <div className="flex border-b border-line text-[10px] font-medium text-muted">
            <div className="sticky left-0 z-20 w-[110px] shrink-0 bg-card px-3 py-1.5">วัน</div>
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}>
              {HOURS.map((h) => (
                <div key={h} className="border-l border-line/60 px-1 py-1.5">
                  {fromLiveMinutes(h)}
                </div>
              ))}
            </div>
          </div>
          {days.map((date) => {
            const daySlots = slots.filter((s) => s.date === date);
            const lanes = assignLanes(daySlots);
            const height = Math.max(lanes.length, 1) * LANE_HEIGHT + 8;
            return (
              <div key={date} className="flex border-b border-line/60">
                <Link
                  href={dayHref(date)}
                  className={`sticky left-0 z-20 flex w-[110px] shrink-0 flex-col justify-center bg-card px-3 text-[11px] hover:text-accent ${
                    date === today ? "text-accent" : "text-soft"
                  }`}
                >
                  <span className="font-semibold">{dayLabel(date)}</span>
                  <span className="text-[10px] text-muted">{daySlots.length} สล็อต</span>
                </Link>
                <div className="relative flex-1" style={{ height }}>
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}>
                    {HOURS.map((h) => (
                      <div key={h} className="border-l border-line/40" />
                    ))}
                  </div>
                  {lanes.map((lane, i) =>
                    lane.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelect(s)}
                        title={`${s.brandName} (${s.platform}) ${timeRange(s.startMinute, s.endMinute)} · ${s.roomName}`}
                        className={`absolute z-10 truncate rounded border-l-[3px] px-1 text-left text-[10px] leading-[20px] ${BLOCK_STYLE[s.status]}`}
                        style={{
                          ...place(s.startMinute, s.endMinute),
                          top: 4 + i * LANE_HEIGHT,
                          height: LANE_HEIGHT - 4,
                          borderLeftColor: colors[s.roomId],
                        }}
                      >
                        {s.brandName}
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
