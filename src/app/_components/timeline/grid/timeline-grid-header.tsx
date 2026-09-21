import {
  dayLabel,
  dayOfMonth,
  isWeekend,
  monthLabel,
} from "@/utils/shared/date";
import type { TimelineGridHeaderProps } from "@/types/timeline/timeline";

export default function TimelineGridHeader({
  days,
  today,
  taskColumn,
}: TimelineGridHeaderProps) {
  return (
    <div className="timeline-header timeline-row">
      <div className="task-column-heading">
        Task
        <div
          className="task-column-resize"
          role="separator"
          aria-label="Resize task name column"
          aria-orientation="vertical"
          aria-valuemin={taskColumn.minWidth}
          aria-valuemax={taskColumn.maxWidth}
          aria-valuenow={taskColumn.width}
          tabIndex={0}
          onPointerDown={taskColumn.beginResize}
          onPointerMove={taskColumn.continueResize}
          onPointerUp={taskColumn.endResize}
          onPointerCancel={taskColumn.endResize}
          onKeyDown={taskColumn.resizeWithKeyboard}
        />
      </div>
      {days.map((day, index) => (
        <div
          className={`day-heading ${isWeekend(day) ? "weekend" : ""} ${day === today ? "today" : ""}`}
          style={{ gridColumn: index + 2 }}
          key={day}
        >
          <span>{dayLabel(day)}</span>
          <strong>{dayOfMonth(day)}</strong>
          {(index === 0 || dayOfMonth(day) === 1) && (
            <small>{monthLabel(day)}</small>
          )}
        </div>
      ))}
    </div>
  );
}
