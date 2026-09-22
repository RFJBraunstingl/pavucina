import { useEffect, useRef } from "react";

import { isNodeDone } from "@/services/event/completion-service";
import { getParentTaskNames } from "@/services/task/core/task-service";
import { getTodoSchedule } from "@/services/todo/todo-service";
import { compactDateLabel } from "@/utils/shared/temporal/date";
import { calendarSourceLabel } from "@/utils/calendar/events/external-calendar";
import type { TodoDetailsDialogProps } from "@/types/timeline/todo";

export default function TodoDetailsDialog({
  graph, item, onClose,
}: TodoDetailsDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (item && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      dialog.current.querySelector("button")?.focus();
    }
    if (!item && dialog.current?.open) dialog.current.close();
  }, [item]);

  const schedule = item && getTodoSchedule(graph, item);
  const path = item?.type === "task"
    ? [...getParentTaskNames(graph, item.id), item.properties.name].join(" › ")
    : "";

  return (
    <dialog
      ref={dialog}
      className="app-dialog todo-details-dialog"
      aria-labelledby="todo-details-heading"
      onClose={onClose}
    >
      {item && schedule && (
        <form method="dialog">
          <header>
            <span className="eyebrow">
              {item.type === "task" ? "Task details" : "Calendar event"}
            </span>
            <h2 id="todo-details-heading">{item.properties.name}</h2>
          </header>
          <dl className="todo-details">
            {item.type === "task" ? (
              <div><dt>Path</dt><dd>{path}</dd></div>
            ) : (
              <>
                <div><dt>Calendar</dt><dd>{item.properties.calendarName}</dd></div>
                {item.properties.externalOrigin && (
                  <div>
                    <dt>Provider</dt>
                    <dd>{calendarSourceLabel(item.properties.externalOrigin.source)}</dd>
                  </div>
                )}
                {item.properties.location && (
                  <div><dt>Location</dt><dd>{item.properties.location}</dd></div>
                )}
              </>
            )}
            <div className="todo-details-description">
              <dt>Description</dt>
              <dd>{item.properties.description?.trim() || "No description."}</dd>
            </div>
            {([
              [item.type === "task" ? "Planned start" : "Start", schedule.startDate, schedule.startTime],
              [item.type === "task" ? "Planned end" : "End", schedule.endDate, schedule.endTime],
            ] as const).map(([label, date, time]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {date ? <time dateTime={date}>{compactDateLabel(date)}</time> : "Not planned"}
                  {date && time && <> · <time dateTime={time}>{time}</time></>}
                  {schedule.allDay && " · All day"}
                </dd>
              </div>
            ))}
            <div>
              <dt>Status</dt>
              <dd>{isNodeDone(graph, item.id) ? "Completed" : "Open"}</dd>
            </div>
            {item.type === "event" && (
              <>
                <div><dt>Time zone</dt><dd>{item.properties.timeZone}</dd></div>
                {item.properties.sourceUrl && (
                  <div>
                    <dt>Source</dt>
                    <dd>
                      <a href={item.properties.sourceUrl} target="_blank" rel="noreferrer">
                        Open in source calendar
                      </a>
                    </dd>
                  </div>
                )}
              </>
            )}
          </dl>
          <div className="dialog-actions">
            <button type="submit" autoFocus>Close</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
