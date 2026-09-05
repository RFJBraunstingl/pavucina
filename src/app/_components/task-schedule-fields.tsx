import { useGraph } from "@/providers/graph-provider";
import {
  getEffectiveTaskDate,
  isTaskSchedulable,
} from "@/services/task-schedule-mode-service";
import { updateTaskDate } from "@/services/task-schedule-service";
import { setTaskTime } from "@/services/task-service";
import type { DateRelationshipType, TimeProperty } from "@/types/graph";
import type { TaskScheduleFieldsProps } from "@/types/timeline";

export default function TaskScheduleFields({
  task,
  scheduleMode,
  helpText,
}: TaskScheduleFieldsProps) {
  const { graph, setGraph } = useGraph();
  if (!graph) return null;
  const disabled = !isTaskSchedulable(graph, task.id, scheduleMode);
  const hint = disabled ? "Leaf node scheduling is enabled." : undefined;
  const description = disabled ? "leaf-schedule-help" : undefined;

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
