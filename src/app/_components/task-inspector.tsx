import { useRef } from "react";

import { getTaskDate } from "@/services/task-schedule-service";
import type { TaskInspectorProps } from "@/types/timeline";

export default function TaskInspector({
  graph,
  selected,
  onDelete,
  onDoneChange,
  onNameChange,
  onDateChange,
}: TaskInspectorProps) {
  const deleteDialog = useRef<HTMLDialogElement>(null);

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
                  onNameChange(selected.id, event.currentTarget.value);
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
            Planned start
            <input
              type="date"
              value={getTaskDate(graph, selected.id, "plannedStartDate") ?? ""}
              onChange={(event) =>
                onDateChange(selected.id, "plannedStartDate", event.target.value)
              }
            />
          </label>
          <label>
            Planned end
            <input
              type="date"
              value={getTaskDate(graph, selected.id, "plannedEndDate") ?? ""}
              onChange={(event) =>
                onDateChange(selected.id, "plannedEndDate", event.target.value)
              }
            />
          </label>
          <div className="inspector-help">
            <span aria-hidden="true">↔</span>
            <p>Drag a bar to move it. Drag either edge to resize by whole days.</p>
          </div>
          <label className="task-done">
            <input
              type="checkbox"
              checked={selected.properties.done ?? false}
              onChange={(event) =>
                onDoneChange(selected.id, event.target.checked)
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
                  onClick={() => onDelete(selected.id)}
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
          <p>Choose a row or timeline bar to edit its name and planned dates.</p>
        </div>
      )}
    </aside>
  );
}
