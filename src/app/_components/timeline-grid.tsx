import { useMemo, useRef } from "react";

import TimelineTaskRow from "./timeline-task-row";
import { useTaskOrder } from "./use-task-order";
import { useTimelineSchedule } from "./use-timeline-schedule";
import { flattenTasks } from "@/services/task-service";
import {
  dayLabel,
  dayOfMonth,
  isWeekend,
  monthLabel,
} from "@/utils/date";
import type { TimelineGridProps } from "@/types/timeline";

export default function TimelineGrid({
  graph,
  days,
  today,
  rangeStart,
  selectedId,
  hideDone,
  collapsedIds,
  onGraphChange,
  onCollapsedIdsChange,
  onSelect,
  onNameChange,
  onAddChild,
  onCreate,
}: TimelineGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const parentIds = new Set(
    graph.relationships
      .filter((relationship) => relationship.type === "child")
      .map((relationship) => relationship.sourceId),
  );
  const tasks = useMemo(
    () =>
      flattenTasks(graph, collapsedIds).filter(
        ({ task }) => !hideDone || !task.properties.done,
      ),
    [collapsedIds, graph, hideDone],
  );
  const schedule = useTimelineSchedule({ graph, onGraphChange, onSelect });
  const order = useTaskOrder({
    graph,
    tasks,
    scrollRef,
    onGraphChange,
    onSelect,
    onExpand: expandTask,
  });

  function expandTask(taskId: string) {
    if (!collapsedIds.has(taskId)) return;
    const next = new Set(collapsedIds);
    next.delete(taskId);
    onCollapsedIdsChange(next);
  }

  function toggleTask(taskId: string) {
    const next = new Set(collapsedIds);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    onCollapsedIdsChange(next);
  }

  function addChild(parentId: string) {
    expandTask(parentId);
    onAddChild(parentId);
  }

  return (
    <div className="timeline-scroll" ref={scrollRef}>
      <p id="task-order-help" className="sr-only">
        Drag to reorder. Use up and down to reorder siblings, right to nest, and
        left to promote.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {order.announcement}
      </p>
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
            hasChildren={parentIds.has(task.id)}
            collapsed={collapsedIds.has(task.id)}
            ordering={order.draggedId === task.id}
            dropPlacement={
              order.preview?.indicatorId === task.id
                ? order.preview.placement
                : undefined
            }
            onSelect={onSelect}
            onNameChange={onNameChange}
            onToggle={toggleTask}
            onAddChild={addChild}
            onSchedule={schedule.scheduleTask}
            onDragStart={schedule.beginDrag}
            onPointerMove={schedule.continueDrag}
            onPointerEnd={schedule.endDrag}
            onArrow={schedule.handleArrow}
            onOrderStart={order.beginOrder}
            onOrderMove={order.continueOrder}
            onOrderEnd={order.endOrder}
            onOrderCancel={order.cancelOrder}
            onOrderKey={order.handleOrderKey}
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
