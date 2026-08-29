import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useMemo,
  useRef,
} from "react";

import {
  flattenTasks,
  getTaskDate,
  moveTask,
  resizeTask,
} from "@/services/task-service";
import {
  dayLabel,
  dayOfMonth,
  daysBetween,
  isWeekend,
  monthLabel,
} from "@/utils/date";
import type {
  DragMode,
  DragState,
  TimelineGridProps,
} from "@/types/timeline";

const DAY_WIDTH = 48;

export default function TimelineGrid({
  graph,
  days,
  today,
  rangeStart,
  selectedId,
  onGraphChange,
  onSelect,
  onAddChild,
}: TimelineGridProps) {
  const drag = useRef<DragState | null>(null);
  const tasks = useMemo(() => flattenTasks(graph), [graph]);

  function changeTask(taskId: string, mode: DragMode, amount: number) {
    onGraphChange(
      mode === "move"
        ? moveTask(graph, taskId, amount)
        : resizeTask(graph, taskId, mode, amount),
    );
  }

  function beginDrag(
    event: PointerEvent<HTMLButtonElement>,
    taskId: string,
    mode: DragMode,
  ) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      taskId,
      mode,
      originX: event.clientX,
      originGraph: graph,
      lastAmount: 0,
    };
    onSelect(taskId);
  }

  function continueDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const amount = Math.round((event.clientX - active.originX) / DAY_WIDTH);
    if (amount === active.lastAmount) return;
    drag.current = { ...active, lastAmount: amount };
    onGraphChange(
      active.mode === "move"
        ? moveTask(active.originGraph, active.taskId, amount)
        : resizeTask(active.originGraph, active.taskId, active.mode, amount),
    );
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function handleArrow(
    event: KeyboardEvent<HTMLButtonElement>,
    taskId: string,
    mode: DragMode,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    changeTask(taskId, mode, event.key === "ArrowLeft" ? -1 : 1);
  }

  return (
    <div className="timeline-scroll">
      <div className="timeline-grid">
        <div className="timeline-header timeline-row">
          <div className="task-column-heading">Task</div>
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

        {tasks.map(({ task, depth }) => {
          const start = getTaskDate(graph, task.id, "plannedStartDate");
          const end = getTaskDate(graph, task.id, "plannedEndDate");
          const startOffset = start ? daysBetween(rangeStart, start) : 0;
          const endOffset = end ? daysBetween(rangeStart, end) : -1;
          const visibleStart = Math.max(0, startOffset);
          const visibleEnd = Math.min(days.length - 1, endOffset);
          const barVisible = Boolean(start && end && visibleStart <= visibleEnd);

          return (
            <div
              className={`timeline-row task-row ${selectedId === task.id ? "selected" : ""}`}
              data-depth={Math.min(depth, 2)}
              key={task.id}
            >
              <div
                className="task-label"
                style={{ paddingLeft: `${18 + Math.min(depth, 8) * 20}px` }}
              >
                <button
                  type="button"
                  className="task-select"
                  onClick={() => onSelect(task.id)}
                >
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
                      onPointerDown={(event) => beginDrag(event, task.id, "start")}
                      onPointerMove={continueDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onKeyDown={(event) => handleArrow(event, task.id, "start")}
                    />
                  )}
                  <button
                    type="button"
                    className="bar-body"
                    aria-label={`Move ${task.properties.name}`}
                    title={`${task.properties.name}: ${start} to ${end}`}
                    onPointerDown={(event) => beginDrag(event, task.id, "move")}
                    onPointerMove={continueDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onKeyDown={(event) => handleArrow(event, task.id, "move")}
                  >
                    <span>{task.properties.name}</span>
                  </button>
                  {endOffset < days.length && (
                    <button
                      type="button"
                      className="resize-handle end"
                      aria-label={`Resize end of ${task.properties.name}`}
                      onPointerDown={(event) => beginDrag(event, task.id, "end")}
                      onPointerMove={continueDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onKeyDown={(event) => handleArrow(event, task.id, "end")}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
