import { isWeekend } from "@/utils/shared/date";
import type { TimelineNewTaskRowProps } from "@/types/timeline/timeline";

export default function TimelineNewTaskRow({
  days,
  today,
  onCreate,
}: TimelineNewTaskRowProps) {
  return (
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
  );
}
