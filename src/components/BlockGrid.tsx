import { Fragment, useMemo } from "react";
import { type WorkSchedule, getPeriods, minutesToTime } from "../utils/timeUtils";
import "./BlockGrid.css";

interface BlockGridProps {
  schedule: WorkSchedule;
  elapsedMinutes: number;
  /** Work-minute index currently in progress, -1 outside work hours */
  currentIndex: number;
  currentSeconds: number;
}

interface RowData {
  startMinute: number;
  firstIndex: number;
  count: number;
  isAfternoonStart: boolean;
}

export function BlockGrid({ schedule, elapsedMinutes, currentIndex, currentSeconds }: BlockGridProps) {
  const { morning, afternoon } = getPeriods(schedule);

  // Split each work period into rows of up to 60 blocks (one per minute)
  const { rows, total } = useMemo(() => {
    const result: RowData[] = [];
    const { morning, afternoon } = getPeriods(schedule);
    let index = 0;

    [morning, afternoon].forEach(({ start, end }, p) => {
      for (let s = start; s < end; s += 60) {
        const count = Math.min(60, end - s);
        result.push({ startMinute: s, firstIndex: index, count, isAfternoonStart: p === 1 && s === start });
        index += count;
      }
    });

    return { rows: result, total: index };
  }, [schedule]);

  return (
    <div className="block-grid">
      {rows.map((row) => {
        const isCurrentRow = currentIndex >= row.firstIndex && currentIndex < row.firstIndex + row.count;
        return (
          <Fragment key={row.firstIndex}>
            {row.isAfternoonStart && (
              <div className="block-lunch">
                <span className="block-lunch-text">
                  Pausa {minutesToTime(morning.end)} – {minutesToTime(afternoon.start)}
                </span>
                <span className="block-lunch-line" aria-hidden="true" />
              </div>
            )}
            <div className="block-row" style={{ "--lines": row.count > 30 ? 2 : 1 } as React.CSSProperties}>
              <span className={`block-row-label${isCurrentRow ? " block-row-label--current" : ""}`}>
                {minutesToTime(row.startMinute)}
              </span>
              <div className="block-row-blocks">
                {Array.from({ length: row.count }, (_, i) => {
                  const index = row.firstIndex + i;
                  const isElapsed = index < elapsedMinutes;
                  const isCurrent = index === currentIndex;
                  return (
                    <div
                      key={i}
                      className={`block${isElapsed ? " block-elapsed" : isCurrent ? " block-current" : ""}`}
                      style={
                        isCurrent
                          ? ({ "--fill": `${(currentSeconds / 60) * 100}%` } as React.CSSProperties)
                          : isElapsed
                            ? ({ "--k": index / Math.max(1, total - 1) } as React.CSSProperties)
                            : undefined
                      }
                      title={minutesToTime(row.startMinute + i)}
                    />
                  );
                })}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
