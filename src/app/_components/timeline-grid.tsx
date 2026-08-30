import {
  type KeyboardEvent,
  type PointerEvent,
  useMemo,
  useRef,
} from "react";

import TimelineTaskRow from "./timeline-task-row";
import {
  flattenTasks,
} from "@/services/task-service";
import {
  moveTask,
  resizeTask,
} from "@/services/task-schedule-service";
import {
  dayLabel,
  dayOfMonth,
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
  onCreate,
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

        {tasks.map(({ task, depth }) => (
          <TimelineTaskRow
            graph={graph}
            task={task}
            depth={depth}
            days={days}
            rangeStart={rangeStart}
            today={today}
            selected={selectedId === task.id}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onDragStart={beginDrag}
            onPointerMove={continueDrag}
            onPointerEnd={endDrag}
            onArrow={handleArrow}
            key={task.id}
          />
        ))}
        <div className="timeline-row task-row create-task-row">
          <div className="task-label" style={{ paddingLeft: "18px" }}>
            <button
              type="button"
              className="task-select create-task"
              onClick={onCreate}
            >
              <span className="create-task-symbol" aria-hidden="true" />
              <span>Create new top-level task</span>
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
        </div>
      </div>
    </div>
  );
}
