import { useRef } from "react";

import { useGraph } from "@/providers/graph-provider";
import {
  deleteTask,
  renameTask,
  setTaskDescription,
  setTaskDone,
  setTaskTime,
} from "@/services/task-service";
import {
  getTaskDate,
  updateTaskDate,
} from "@/services/task-schedule-service";
import type { DateRelationshipType, TaskNode, TimeProperty } from "@/types/graph";
import type { TaskInspectorProps } from "@/types/timeline";

export default function TaskInspector({
  selectedId,
  helpText = "Drag a bar to move it. Drag either edge to resize by whole days.",
  onDeleted,
}: TaskInspectorProps) {
  const { graph, setGraph } = useGraph();
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const selected = graph?.nodes.find(
    (node): node is TaskNode => node.id === selectedId && node.type === "task",
  );

  if (!graph) return null;

  function updateName(taskId: string, value: string) {
    setGraph((current) =>
      current ? renameTask(current, taskId, value) : current,
    );
  }

  function updateDone(taskId: string, done: boolean) {
    setGraph((current) =>
      current ? setTaskDone(current, taskId, done) : current,
    );
  }

  function updateDescription(taskId: string, value: string) {
    setGraph((current) =>
      current ? setTaskDescription(current, taskId, value) : current,
    );
  }

  function updateDate(taskId: string, type: DateRelationshipType, value: string) {
    setGraph((current) =>
      current ? updateTaskDate(current, taskId, type, value) : current,
    );
  }

  function updateTime(taskId: string, type: TimeProperty, value: string) {
    setGraph((current) =>
      current ? setTaskTime(current, taskId, type, value) : current,
    );
  }

  function removeTask(taskId: string) {
    setGraph((current) => (current ? deleteTask(current, taskId) : current));
    onDeleted();
  }

  return (
    <aside className="inspector" aria-labelledby="inspector-heading">
      {selected ? (
        <>
          <button
            type="button"
            className="delete-task"
            aria-label={`Delete ${selected.properties.name}`}
            title="Delete task"
            onClick={() => deleteDialog.current?.showModal()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
            </svg>
          </button>
          <p className="eyebrow">Selected task</p>
          <h2 id="inspector-heading">Edit details</h2>
          <label>
            Name
            <input
              key={selected.id}
              type="text"
              defaultValue={selected.properties.name}
              onBlur={(event) => {
                if (event.currentTarget.value.trim()) {
                  updateName(selected.id, event.currentTarget.value);
                } else {
                  event.currentTarget.value = selected.properties.name;
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </label>
          <label>
            Description
            <textarea
              rows={5}
              value={selected.properties.description ?? ""}
              onChange={(event) =>
                updateDescription(selected.id, event.currentTarget.value)
              }
            />
          </label>
          <label>
            Planned start
            <input
              type="date"
              value={getTaskDate(graph, selected.id, "plannedStartDate") ?? ""}
              onChange={(event) =>
                updateDate(selected.id, "plannedStartDate", event.target.value)
              }
            />
          </label>
          <label>
            Planned end
            <input
              type="date"
              value={getTaskDate(graph, selected.id, "plannedEndDate") ?? ""}
              onChange={(event) =>
                updateDate(selected.id, "plannedEndDate", event.target.value)
              }
            />
          </label>
          <label>
            Start time
            <input
              type="time"
              value={selected.properties.plannedStartTime ?? ""}
              onChange={(event) =>
                updateTime(selected.id, "plannedStartTime", event.target.value)
              }
            />
          </label>
          <label>
            End time
            <input
              type="time"
              value={selected.properties.plannedEndTime ?? ""}
              onChange={(event) =>
                updateTime(selected.id, "plannedEndTime", event.target.value)
              }
            />
          </label>
          <div className="inspector-help">
            <span aria-hidden="true">↔</span>
            <p>{helpText}</p>
          </div>
          <label className="task-done">
            <input
              type="checkbox"
              checked={selected.properties.done ?? false}
              onChange={(event) =>
                updateDone(selected.id, event.target.checked)
              }
            />
            Done
          </label>
          <dialog
            ref={deleteDialog}
            className="delete-dialog"
            aria-labelledby="delete-dialog-heading"
          >
            <form method="dialog">
              <h3 id="delete-dialog-heading">Delete task?</h3>
              <p>
                <strong>{selected.properties.name}</strong> and all of its child
                tasks will be permanently deleted.
              </p>
              <div className="delete-dialog-actions">
                <button type="submit" autoFocus>Cancel</button>
                <button
                  type="submit"
                  className="confirm-delete"
                  onClick={() => removeTask(selected.id)}
                >
                  Delete
                </button>
              </div>
            </form>
          </dialog>
        </>
      ) : (
        <div className="empty-inspector">
          <span aria-hidden="true">↗</span>
          <h2 id="inspector-heading">Select a task</h2>
          <p>Choose a row or timeline bar to edit its details.</p>
        </div>
      )}
    </aside>
  );
}
