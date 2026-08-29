import type { CSSProperties } from "react";

import { getTaskDate } from "@/services/task-schedule-service";
import { daysBetween, isWeekend } from "@/utils/date";
import type { TimelineTaskRowProps } from "@/types/timeline";

export default function TimelineTaskRow({
  graph,
  task,
  depth,
  days,
  rangeStart,
  today,
  selected,
  onSelect,
  onAddChild,
  onDragStart,
  onPointerMove,
  onPointerEnd,
  onArrow,
}: TimelineTaskRowProps) {
  const start = getTaskDate(graph, task.id, "plannedStartDate");
  const end = getTaskDate(graph, task.id, "plannedEndDate");
  const startOffset = start ? daysBetween(rangeStart, start) : 0;
  const endOffset = end ? daysBetween(rangeStart, end) : -1;
  const visibleStart = Math.max(0, startOffset);
  const visibleEnd = Math.min(days.length - 1, endOffset);
  const barVisible = Boolean(start && end && visibleStart <= visibleEnd);

  return (
    <div
      className={`timeline-row task-row ${selected ? "selected" : ""}`}
      data-depth={Math.min(depth, 2)}
    >
      <div
        className="task-label"
        style={{ paddingLeft: `${18 + Math.min(depth, 8) * 20}px` }}
      >
        <button type="button" className="task-select" onClick={() => onSelect(task.id)}>
          <span>{task.properties.name}</span>
        </button>
        <button
          type="button"
          className="add-child"
          aria-label={`Add child to ${task.properties.name}`}
          title="Add child task"
          onClick={() => onAddChild(task.id)}
        >
          +
        </button>
      </div>

      {days.map((day, index) => (
        <div
          aria-hidden="true"
          className={`day-cell ${isWeekend(day) ? "weekend" : ""} ${day === today ? "today" : ""}`}
          style={{ gridColumn: index + 2 }}
          key={day}
        />
      ))}

      {barVisible && (
        <div
          className="task-bar"
          style={
            {
              gridColumn: `${visibleStart + 2} / span ${visibleEnd - visibleStart + 1}`,
            } as CSSProperties
          }
        >
          {startOffset >= 0 && (
            <button
              type="button"
              className="resize-handle start"
              aria-label={`Resize start of ${task.properties.name}`}
              onPointerDown={(event) => onDragStart(event, task.id, "start")}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onKeyDown={(event) => onArrow(event, task.id, "start")}
            />
          )}
          <button
            type="button"
            className="bar-body"
            aria-label={`Move ${task.properties.name}`}
            title={`${task.properties.name}: ${start} to ${end}`}
            onPointerDown={(event) => onDragStart(event, task.id, "move")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={(event) => onArrow(event, task.id, "move")}
          >
            <span>{task.properties.name}</span>
          </button>
          {endOffset < days.length && (
            <button
              type="button"
              className="resize-handle end"
              aria-label={`Resize end of ${task.properties.name}`}
              onPointerDown={(event) => onDragStart(event, task.id, "end")}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onKeyDown={(event) => onArrow(event, task.id, "end")}
            />
          )}
        </div>
      )}
    </div>
  );
}
