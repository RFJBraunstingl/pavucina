import { isNodeDone } from "@/services/event/completion-service";
import { getParentTaskNames } from "@/services/task/core/task-service";
import { getTodoSchedule } from "@/services/todo/todo-service";
import { compactDateLabel } from "@/utils/shared/date";
import type { TodoListItemProps } from "@/types/timeline/todo";

export default function TodoListItem({
  graph, item, showFullTaskPath, onDetails, onCompletion,
}: TodoListItemProps) {
  const { startDate, endDate, startTime, endTime, allDay } = getTodoSchedule(graph, item);
  const parentNames = item.type === "task" && showFullTaskPath
    ? getParentTaskNames(graph, item.id) : [];
  const done = isNodeDone(graph, item.id);

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
      <button
        type="button"
        className={`completion-button${done ? " is-reopen" : ""}`}
        onClick={() => onCompletion(item.id, done)}
      >
        {done ? "Reopen" : "Mark as done"}
      </button>
    </li>
  );
}
