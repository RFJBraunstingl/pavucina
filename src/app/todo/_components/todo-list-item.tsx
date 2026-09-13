import { isTaskDone } from "@/services/task-completion-service";
import { getParentTaskNames } from "@/services/task-service";
import { getTodoSchedule } from "@/services/todo-service";
import { compactDateLabel } from "@/utils/date";
import type { TodoListItemProps } from "@/types/todo";

export default function TodoListItem({
  graph, item, showFullTaskPath, onDetails, onCompletion,
}: TodoListItemProps) {
  const { startDate, endDate, startTime, endTime, allDay } = getTodoSchedule(graph, item);
  const parentNames = item.type === "task" && showFullTaskPath
    ? getParentTaskNames(graph, item.id) : [];
  const done = item.type === "task" && isTaskDone(graph, item.id);

  return (
    <li className={`todo-item${done ? " is-done" : ""}`}>
      <span className="todo-copy">
        {item.type === "event" && (
          <span className="todo-calendar">
            <span
              className="todo-calendar-color"
              style={{ backgroundColor: item.properties.calendarColor }}
              aria-hidden="true"
            />
            Calendar event · {item.properties.calendarName}
          </span>
        )}
        {parentNames.length > 0 && (
          <span className="todo-path">{parentNames.join(" › ")}</span>
        )}
        <span className="todo-name">
          <strong>{item.properties.name}</strong>
          <button
            type="button"
            className="todo-details-button"
            aria-label={`Show details for ${item.properties.name}`}
            title={`Show ${item.type} details`}
            onClick={() => onDetails(item.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v6m0-9h.01" />
            </svg>
          </button>
        </span>
        <span>
          {startDate && <time dateTime={startDate}>{compactDateLabel(startDate)}</time>}
          {startTime && <> · <time dateTime={startTime}>{startTime}</time></>}
          {(endDate || endTime) && " – "}
          {endDate && <time dateTime={endDate}>{compactDateLabel(endDate)}</time>}
          {endTime && <> · <time dateTime={endTime}>{endTime}</time></>}
          {allDay && " · All day"}
        </span>
      </span>
      {item.type === "task" && (
        <button
          type="button"
          className={`completion-button${done ? " is-reopen" : ""}`}
          onClick={() => onCompletion(item.id, done)}
        >
          {done ? "Reopen" : "Mark as done"}
        </button>
      )}
    </li>
  );
}
