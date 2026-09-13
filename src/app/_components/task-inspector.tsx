import { useRef } from "react";

import { useGraph } from "@/providers/graph-provider";
import TaskScheduleFields from "./task-schedule-fields";
import {
  deleteTask,
  renameTask,
  setTaskDescription,
} from "@/services/task-service";
import {
  isNodeDone,
  markNodeDone,
  reopenNode,
} from "@/services/completion-service";
import type { TaskNode } from "@/types/graph";
import type { TaskInspectorProps } from "@/types/timeline";

export default function TaskInspector({
  selectedId,
  scheduleMode,
  scheduleDate,
  helpText = "Drag a bar to move it. Drag either edge to resize by whole days.",
  onDeleted,
}: TaskInspectorProps) {
  const { graph, setGraph, today } = useGraph();
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const selected = graph?.nodes.find(
    (node): node is TaskNode => node.id === selectedId && node.type === "task",
  );
  if (!graph) return null;
  const done = selected ? isNodeDone(graph, selected.id) : false;

  function updateName(taskId: string, value: string) {
    setGraph((current) =>
      current ? renameTask(current, taskId, value) : current,
    );
  }

  function updateCompletion(taskId: string, done: boolean) {
    setGraph((current) =>
      current
        ? done
          ? reopenNode(current, taskId, today)
          : markNodeDone(current, taskId, today)
        : current,
    );
  }

  function updateDescription(taskId: string, value: string) {
    setGraph((current) =>
      current ? setTaskDescription(current, taskId, value) : current,
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
          <TaskScheduleFields
            task={selected}
            scheduleMode={scheduleMode}
            scheduleDate={scheduleDate}
            helpText={helpText}
          />
          <button
            type="button"
            className={`completion-button${done ? " is-reopen" : ""}`}
            onClick={() => updateCompletion(selected.id, done)}
          >
            {done ? "Reopen" : "Mark as done"}
          </button>
          <dialog
            ref={deleteDialog}
            className="app-dialog"
            aria-labelledby="delete-dialog-heading"
          >
            <form method="dialog">
              <h3 id="delete-dialog-heading">Delete task?</h3>
              <p>
                <strong>{selected.properties.name}</strong> and all of its child
                tasks will be permanently deleted.
              </p>
              <div className="dialog-actions">
                <button type="submit" autoFocus>Cancel</button>
                <button
                  type="submit"
                  className="dialog-danger"
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
