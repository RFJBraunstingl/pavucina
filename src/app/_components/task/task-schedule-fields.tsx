import { useGraph } from "@/providers/graph-provider";
import {
  getEffectiveTaskDate,
  isTaskSchedulable,
} from "@/services/task/scheduling/task-schedule-mode-service";
import {
  scheduleTaskForDay,
  taskDuration,
} from "@/services/task/scheduling/day/task-day-schedule-service";
import {
  getTaskDate,
  updateTaskDate,
} from "@/services/task/scheduling/task-date-service";
import { setTaskTime } from "@/services/task/core/task-service";
import { compactDateLabel } from "@/utils/shared/temporal/date";
import type { DateRelationshipType, TimeProperty } from "@/types/graph/graph";
import type { TaskScheduleFieldsProps } from "@/types/timeline/timeline-task";

export default function TaskScheduleFields({
  task,
  scheduleMode,
  scheduleDate,
  helpText,
}: TaskScheduleFieldsProps) {
  const { graph, setGraph } = useGraph();
  if (!graph) return null;
  const disabled = !isTaskSchedulable(graph, task.id, scheduleMode);
  const hint = disabled ? "Leaf node scheduling is enabled." : undefined;
  const description = disabled ? "leaf-schedule-help" : undefined;
  const scheduledForDay = scheduleDate &&
    getTaskDate(graph, task.id, "plannedStartDate") === scheduleDate &&
    getTaskDate(graph, task.id, "plannedEndDate") === scheduleDate;
  const duration = taskDuration(task);

  function updateDate(type: DateRelationshipType, value: string) {
    setGraph((current) =>
      current ? updateTaskDate(current, task.id, type, value) : current,
    );
  }

  function updateTime(type: TimeProperty, value: string) {
    setGraph((current) =>
      current ? setTaskTime(current, task.id, type, value) : current,
    );
  }

  function scheduleForDay() {
    const startTime = task.properties.plannedStartTime;
    const endTime = task.properties.plannedEndTime;
    if (!scheduleDate || !startTime || !endTime) return;
    setGraph((current) => current
      ? scheduleTaskForDay(current, task.id, scheduleDate, startTime, endTime)
      : current,
    );
  }

  return (
    <>
      {disabled && (
        <p id="leaf-schedule-help" className="sr-only">
          Leaf node scheduling is enabled. Parent dates are calculated from
          child tasks.
        </p>
      )}
      {(["plannedStartDate", "plannedEndDate"] as const).map((type) => (
        <label title={hint} key={type}>
          {type === "plannedStartDate" ? "Planned start" : "Planned end"}
          <input
            type="date"
            value={
              getEffectiveTaskDate(graph, task.id, type, scheduleMode) ?? ""
            }
            disabled={disabled}
            aria-describedby={description}
            onChange={(event) => updateDate(type, event.target.value)}
          />
        </label>
      ))}
      {(["plannedStartTime", "plannedEndTime"] as const).map((type) => (
        <label title={hint} key={type}>
          {type === "plannedStartTime" ? "Start time" : "End time"}
          <input
            type="time"
            value={disabled ? "" : (task.properties[type] ?? "")}
            disabled={disabled}
            aria-describedby={description}
            onChange={(event) => updateTime(type, event.target.value)}
          />
        </label>
      ))}
      {scheduleDate && !scheduledForDay && !disabled && (
        <button
          type="button"
          className="schedule-task"
          disabled={!duration}
          aria-describedby={!duration ? "schedule-task-help" : undefined}
          onClick={scheduleForDay}
        >
          Schedule for {compactDateLabel(scheduleDate)}
        </button>
      )}
      {scheduleDate && !scheduledForDay && !disabled && !duration && (
        <p id="schedule-task-help" className="schedule-task-help">
          Enter a start time and a later end time to schedule this task.
        </p>
      )}
      <div className="inspector-help">
        <span aria-hidden="true">↔</span>
        <p>
          {disabled
            ? "Leaf node scheduling is enabled. Parent dates are calculated from child tasks."
            : helpText}
        </p>
      </div>
    </>
  );
}
