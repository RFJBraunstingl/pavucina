import { useEffect, useRef } from "react";

import { isTaskDone } from "@/services/task-completion-service";
import { getTaskDate } from "@/services/task-schedule-service";
import { getParentTaskNames } from "@/services/task-service";
import { compactDateLabel } from "@/utils/date";
import type { TodoTaskDetailsDialogProps } from "@/types/todo";

export default function TaskDetailsDialog({
  graph,
  task,
  onClose,
}: TodoTaskDetailsDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (task && !dialog.current?.open) dialog.current?.showModal();
    if (!task && dialog.current?.open) dialog.current.close();
  }, [task]);

  const startDate = task && getTaskDate(graph, task.id, "plannedStartDate");
  const endDate = task && getTaskDate(graph, task.id, "plannedEndDate");
  const path = task
    ? [...getParentTaskNames(graph, task.id), task.properties.name].join(" › ")
    : "";

  return (
    <dialog
      ref={dialog}
      className="app-dialog todo-details-dialog"
      aria-labelledby="todo-details-heading"
      onClose={onClose}
    >
      {task && (
        <form method="dialog">
          <header>
            <span className="eyebrow">Task details</span>
            <h2 id="todo-details-heading">{task.properties.name}</h2>
          </header>
          <dl className="todo-details">
            <div>
              <dt>Path</dt>
              <dd>{path}</dd>
            </div>
            <div className="todo-details-description">
              <dt>Description</dt>
              <dd>{task.properties.description?.trim() || "No description."}</dd>
            </div>
            <div>
              <dt>Planned start</dt>
              <dd>
                {startDate ? (
                  <time dateTime={startDate}>{compactDateLabel(startDate)}</time>
                ) : "Not planned"}
                {startDate && task.properties.plannedStartTime && (
                  <>
                    {" · "}
                    <time dateTime={task.properties.plannedStartTime}>
                      {task.properties.plannedStartTime}
                    </time>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Planned end</dt>
              <dd>
                {endDate ? (
                  <time dateTime={endDate}>{compactDateLabel(endDate)}</time>
                ) : "Not planned"}
                {endDate && task.properties.plannedEndTime && (
                  <>
                    {" · "}
                    <time dateTime={task.properties.plannedEndTime}>
                      {task.properties.plannedEndTime}
                    </time>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{isTaskDone(graph, task.id) ? "Completed" : "Open"}</dd>
            </div>
          </dl>
          <div className="dialog-actions">
            <button type="submit" autoFocus>
              Close
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
