import type { CSSProperties } from "react";

import { compactDateLabel } from "@/utils/date";
import type { ScheduleTrayProps } from "@/types/schedule";

export default function ScheduleTray({
  days,
  selectedId,
  selectedDate,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: ScheduleTrayProps) {
  const taskCount = new Set(
    days.flatMap(({ tasks }) => tasks.map(({ task }) => task.id)),
  ).size;

  return (
    <section className="schedule-tray" aria-labelledby="schedule-tray-heading">
      <div className="schedule-tray-heading">
        <div>
          <p className="eyebrow">Unscheduled</p>
          <h3 id="schedule-tray-heading">
            {days.length === 1 ? "Plan this day" : "Plan these days"}
          </h3>
        </div>
        <span>{taskCount}</span>
      </div>
      <div
        className="schedule-tray-days"
        style={{ "--schedule-days": days.length } as CSSProperties}
      >
        {days.map(({ date, tasks }) => (
          <div className="schedule-tray-day" key={date}>
            <h4><time dateTime={date}>{compactDateLabel(date)}</time></h4>
            {tasks.length ? tasks.map(({ task, startDate, endDate }) => (
              <button
                type="button"
                className={`schedule-tray-task${selectedId === task.id && selectedDate === date ? " selected" : ""}`}
                aria-pressed={selectedId === task.id && selectedDate === date}
                key={task.id}
                onClick={() => onSelect(task.id, date)}
                onPointerDown={(event) => onDragStart(event, task, date)}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragCancel}
              >
                <strong>{task.properties.name}</strong>
                <span>
                  <time dateTime={startDate}>{compactDateLabel(startDate)}</time>
                  {" – "}
                  <time dateTime={endDate}>{compactDateLabel(endDate)}</time>
                </span>
              </button>
            )) : (
              <p className="schedule-tray-empty">No unscheduled tasks.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
