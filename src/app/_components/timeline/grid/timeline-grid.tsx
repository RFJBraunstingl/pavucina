import { useRef } from "react";

import TimelineTaskRow from "./row/timeline-task-row";
import TimelineGridHeader from "./timeline-grid-header";
import TimelineNewTaskRow from "./timeline-new-task-row";
import { useTaskOrder } from "./order/use-task-order";
import { useTaskColumnResize } from "./use-task-column-resize";
import { useTimelineSchedule } from "./use-timeline-schedule";
import { getParentTaskIds } from "@/services/task/core/task-service";
import type { TimelineGridProps } from "@/types/timeline/timeline";

const NO_EXPANDED_FILTERS = new Set<string>();

export default function TimelineGrid({
  graph,
  scheduleMode,
  days,
  today,
  rangeStart,
  selectedId,
  tasks,
  filterExpandedIds = NO_EXPANDED_FILTERS,
  filterActive = false,
  taskColumnWidth,
  collapsedIds,
  externalDropTargetId,
  onGraphChange,
  onCollapsedIdsChange,
  onTaskColumnWidthChange,
  onSelect,
  onNameChange,
  onAddChild,
  onCreate,
}: TimelineGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const taskColumn = useTaskColumnResize(
    taskColumnWidth,
    onTaskColumnWidthChange,
  );
  const parentIds = getParentTaskIds(graph);
  const schedule = useTimelineSchedule({
    graph,
    scheduleMode,
    onGraphChange,
    onSelect,
  });
  const order = useTaskOrder({
    graph,
    scheduleMode,
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
    if (filterExpandedIds.has(taskId)) return;
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
      <div className="timeline-grid" style={taskColumn.style}>
        <TimelineGridHeader
          days={days}
          today={today}
          taskColumn={taskColumn}
        />

        {filterActive && tasks.length === 0 && (
          <div className="timeline-row task-row">
            <p className="timeline-filter-empty">No visible tasks match these filters.</p>
          </div>
        )}
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
            schedulingDisabled={
              scheduleMode === "leaf" && parentIds.has(task.id)
            }
            collapsed={collapsedIds.has(task.id) && !filterExpandedIds.has(task.id)}
            collapseLocked={filterExpandedIds.has(task.id)}
            ordering={order.draggedId === task.id}
            dropPlacement={
              externalDropTargetId === task.id
                ? "inside"
                : order.preview?.indicatorId === task.id
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
        <TimelineNewTaskRow days={days} today={today} onCreate={onCreate} />
      </div>
    </div>
  );
}
