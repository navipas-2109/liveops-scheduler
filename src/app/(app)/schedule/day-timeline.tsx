import { Plus } from "lucide-react";
import type { SlotListItem } from "@/application/ports";
import { fromLiveMinutes } from "@/domain/time";
import { dayLabel, timeRange } from "../../format";
import { assignLanes, BLOCK_STYLE, HOURS, outsideShift, place, type TimelineRow } from "./schedule-shared";

interface Props {
  date: string;
  rows: TimelineRow[];
  rowLabel: string;
  slotCount: number;
  colors: Record<string, string>;
  // Second line of each block: MC when rows are rooms, room when rows are PDs.
  blockDetail: (slot: SlotListItem) => string;
  selectedId: string | null;
  onSelect: (slot: SlotListItem) => void;
  onAdd: ((roomId: string, minute: number) => void) | null;
  emptyText: string;
}

const LANE_HEIGHT = 34;

// Rows down the side (name stays visible while scrolling sideways), hours
// 07:00–02:00 across. Slots span their real length; a row's shift, if any,
// is shaded behind its slots.
export function DayTimeline(props: Props) {
  const { date, rows, rowLabel, slotCount, colors, blockDetail, selectedId, onSelect, onAdd, emptyText } = props;
  const gridColumns = { gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` };

  return (
    <section className="rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">
          {dayLabel(date)} <span className="font-normal text-muted">· {slotCount} สล็อต</span>
        </h2>
        {onAdd && <p className="text-[11px] text-muted">คลิกช่องว่างเพื่อเพิ่มสล็อต</p>}
      </div>
      {rows.length === 0 ? (
        <p className="border-t border-line px-4 py-10 text-center text-xs text-muted">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            <div className="flex border-y border-line text-[10px] font-medium text-muted">
              <div className="sticky left-0 z-20 w-[190px] shrink-0 bg-card px-3 py-1.5">{rowLabel}</div>
              <div className="grid flex-1" style={gridColumns}>
                {HOURS.map((h) => (
                  <div key={h} className="border-l border-line/60 px-1 py-1.5">
                    {fromLiveMinutes(h)}
                  </div>
                ))}
              </div>
            </div>

            {rows.map((row) => {
              const lanes = assignLanes(row.slots);
              const height = Math.max(lanes.length, 1) * LANE_HEIGHT + 6;
              const addRoom = onAdd && row.roomId;
              return (
                <div key={row.id} className="flex border-b border-line/60">
                  <div
                    className="sticky left-0 z-20 flex w-[190px] shrink-0 flex-col justify-center border-l-[3px] bg-card px-3 text-[11px]"
                    style={{ borderLeftColor: row.accent }}
                  >
                    <span className={`truncate font-medium ${row.warn ? "text-waiting-fg" : "text-soft"}`}>
                      {row.title}
                      {row.shift && <span className="ml-1 text-muted">· {row.slots.length} ไลฟ์</span>}
                    </span>
                    <span className="truncate text-[10px] text-muted">{row.subtitle}</span>
                  </div>
                  <div className="relative flex-1" style={{ height }}>
                    {row.shift && (
                      <div
                        aria-hidden
                        className="absolute inset-y-0.5 rounded border border-dashed border-accent/40 bg-accent/10"
                        style={place(row.shift.start, row.shift.end)}
                      />
                    )}
                    <div className="absolute inset-0 grid" style={gridColumns}>
                      {HOURS.map((h) =>
                        addRoom ? (
                          <button
                            key={h}
                            type="button"
                            onClick={() => onAdd(row.roomId!, h)}
                            aria-label={`เพิ่มสล็อต ${row.title} ${fromLiveMinutes(h)}`}
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
                      lane.map((s) => {
                        const offShift = outsideShift(s, row.shift);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => onSelect(s)}
                            title={`${s.brandName} (${s.platform}) ${timeRange(s.startMinute, s.endMinute)}${
                              offShift ? " · นอกเวลากะ" : ""
                            }`}
                            className={`absolute z-10 overflow-hidden rounded-md border-l-[3px] px-1.5 text-left text-[10px] leading-tight ${BLOCK_STYLE[s.status]} ${
                              selectedId === s.id ? "outline outline-2 outline-accent" : ""
                            } ${offShift ? "outline-dashed outline-1 outline-waiting-fg" : ""}`}
                            style={{
                              ...place(s.startMinute, s.endMinute),
                              top: 3 + i * LANE_HEIGHT,
                              height: LANE_HEIGHT - 4,
                              borderLeftColor: colors[s.roomId],
                            }}
                          >
                            <span className="block truncate font-semibold">
                              {offShift && "⚠ "}
                              {s.brandName}
                            </span>
                            <span className="block truncate opacity-80">
                              {timeRange(s.startMinute, s.endMinute)} · {blockDetail(s)}
                            </span>
                          </button>
                        );
                      }),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
