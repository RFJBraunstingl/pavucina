import type { CSSProperties } from "react";

import { getEffectiveTaskDate } from "@/services/task-schedule-mode-service";
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
  hasChildren,
  schedulingDisabled,
  collapsed,
  ordering,
  dropPlacement,
  onSelect,
  onNameChange,
  onToggle,
  onAddChild,
  onSchedule,
  onDragStart,
  onPointerMove,
  onPointerEnd,
  onArrow,
  onOrderStart,
  onOrderMove,
  onOrderEnd,
  onOrderCancel,
  onOrderKey,
}: TimelineTaskRowProps) {
  const scheduleMode = schedulingDisabled ? "leaf" : "all";
  const start = getEffectiveTaskDate(
    graph,
    task.id,
    "plannedStartDate",
    scheduleMode,
  );
  const end = getEffectiveTaskDate(
    graph,
    task.id,
    "plannedEndDate",
    scheduleMode,
  );
  const scheduleHint = schedulingDisabled
    ? "Leaf node scheduling is enabled."
    : undefined;
  const startOffset = start ? daysBetween(rangeStart, start) : 0;
  const endOffset = end ? daysBetween(rangeStart, end) : -1;
  const visibleStart = Math.max(0, startOffset);
  const visibleEnd = Math.min(days.length - 1, endOffset);
  const unscheduled = !start && !end;
  const barVisible = Boolean(start && end && visibleStart <= visibleEnd);

  return (
    <div
      className={`timeline-row task-row ${selected ? "selected" : ""} ${ordering ? "ordering" : ""} ${dropPlacement ? `drop-${dropPlacement}` : ""}`}
      data-depth={Math.min(depth, 2)}
      data-task-id={task.id}
    >
      <div
        className="task-label"
        style={{ paddingLeft: `${18 + Math.min(depth, 8) * 20}px` }}
      >
        <button
          type="button"
          className="task-order"
          aria-label={`Reorder ${task.properties.name}`}
          aria-describedby="task-order-help"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          title="Drag to reorder"
          onPointerDown={(event) => onOrderStart(event, task.id)}
          onPointerMove={onOrderMove}
          onPointerUp={onOrderEnd}
          onPointerCancel={onOrderCancel}
          onKeyDown={(event) => onOrderKey(event, task.id)}
        >
          <span aria-hidden="true">⠿</span>
        </button>
        {hasChildren ? (
          <button
            type="button"
            className="task-toggle"
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? "Expand" : "Collapse"} ${task.properties.name}`}
            onClick={() => onToggle(task.id)}
          >
            <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
          </button>
        ) : (
          <span className="task-toggle" aria-hidden="true" />
        )}
        <input
          key={task.properties.name}
          type="text"
          className="task-name-input"
          aria-label={`Task name: ${task.properties.name}`}
          defaultValue={task.properties.name}
          onFocus={() => onSelect(task.id)}
          onBlur={(event) => {
            if (event.currentTarget.value.trim()) {
              onNameChange(task.id, event.currentTarget.value);
            } else {
              event.currentTarget.value = task.properties.name;
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
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

      {days.map((day, index) => {
        const className = `day-cell ${isWeekend(day) ? "weekend" : ""} ${day === today ? "today" : ""}`;
        const style = { gridColumn: index + 2 };
        return unscheduled ? (
          <button
            type="button"
            aria-label={`Schedule ${task.properties.name} on ${day}`}
            className={`${className} schedule-cell`}
            style={style}
            onClick={() => onSchedule(task.id, day)}
            disabled={schedulingDisabled}
            title={scheduleHint}
            key={day}
          />
        ) : (
          <div
            aria-hidden="true"
            className={className}
            style={style}
            key={day}
          />
        );
      })}

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
              disabled={schedulingDisabled}
              title={scheduleHint}
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
            disabled={schedulingDisabled}
            title={
              scheduleHint ?? `${task.properties.name}: ${start} to ${end}`
            }
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
              disabled={schedulingDisabled}
              title={scheduleHint}
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
