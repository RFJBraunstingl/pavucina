import TaskRowLabel from "./task-row-label";
import TaskScheduleBar from "./task-schedule-bar";
import { getEffectiveTaskDate } from "@/services/task/scheduling/task-schedule-mode-service";
import { daysBetween, isWeekend } from "@/utils/shared/temporal/date";
import type { TimelineTaskRowProps } from "@/types/timeline/timeline-task";

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
  collapseLocked,
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
  const start = getEffectiveTaskDate(graph, task.id, "plannedStartDate", scheduleMode);
  const end = getEffectiveTaskDate(graph, task.id, "plannedEndDate", scheduleMode);
  const scheduleHint = schedulingDisabled
    ? "Leaf node scheduling is enabled."
    : undefined;
  const startOffset = start ? daysBetween(rangeStart, start) : 0;
  const endOffset = end ? daysBetween(rangeStart, end) : -1;
  const visibleStart = Math.max(0, startOffset);
  const visibleEnd = Math.min(days.length - 1, endOffset);
  const unscheduled = !start && !end;
  const barVisible = start && end && visibleStart <= visibleEnd;
  const rowClassName = [
    "timeline-row task-row",
    selected && "selected",
    ordering && "ordering",
    dropPlacement && `drop-${dropPlacement}`,
  ].filter(Boolean).join(" ");

  return (
    <div
      className={rowClassName}
      data-depth={Math.min(depth, 2)}
      data-task-id={task.id}
    >
      <TaskRowLabel
        task={task}
        depth={depth}
        hasChildren={hasChildren}
        collapsed={collapsed}
        collapseLocked={collapseLocked}
        onSelect={onSelect}
        onNameChange={onNameChange}
        onToggle={onToggle}
        onAddChild={onAddChild}
        onOrderStart={onOrderStart}
        onOrderMove={onOrderMove}
        onOrderEnd={onOrderEnd}
        onOrderCancel={onOrderCancel}
        onOrderKey={onOrderKey}
      />

      {days.map((day, index) => {
        const className = [
          "day-cell",
          isWeekend(day) && "weekend",
          day === today && "today",
        ].filter(Boolean).join(" ");
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
        <TaskScheduleBar
          task={task}
          schedulingDisabled={schedulingDisabled}
          start={start}
          end={end}
          startOffset={startOffset}
          endOffset={endOffset}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          dayCount={days.length}
          scheduleHint={scheduleHint}
          onDragStart={onDragStart}
          onPointerMove={onPointerMove}
          onPointerEnd={onPointerEnd}
          onArrow={onArrow}
        />
      )}
    </div>
  );
}
