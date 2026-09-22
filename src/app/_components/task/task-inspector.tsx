import { useGraph } from "@/providers/graph-provider";
import TaskDeleteControl from "./task-delete-control";
import TaskScheduleFields from "./task-schedule-fields";
import {
  deleteTask,
  getParentTaskNames,
  renameTask,
  setTaskDescription,
} from "@/services/task/core/task-service";
import {
  isNodeDone,
  markNodeDone,
  reopenNode,
} from "@/services/event/completion-service";
import type { TaskNode } from "@/types/graph/graph";
import type { TaskInspectorProps } from "@/types/timeline/timeline-task";

export default function TaskInspector({
  selectedId,
  scheduleMode,
  scheduleDate,
  helpText = "Drag a bar to move it. Drag either edge to resize by whole days.",
  onDeleted,
}: TaskInspectorProps) {
  const { graph, setGraph, today } = useGraph();
  const selected = graph?.nodes.find(
    (node): node is TaskNode => node.id === selectedId && node.type === "task",
  );
  if (!graph) return null;
  const done = selected ? isNodeDone(graph, selected.id) : false;
  const parentNames = selected ? getParentTaskNames(graph, selected.id) : [];

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

  function removeSelectedTask() {
    if (!selected) return;
    setGraph((current) =>
      current ? deleteTask(current, selected.id) : current,
    );
    onDeleted();
  }

  return (
    <aside className="inspector" aria-labelledby="inspector-heading">
      {selected ? (
        <>
          <TaskDeleteControl
            taskName={selected.properties.name}
            onDelete={removeSelectedTask}
          />
          <p className="eyebrow">Selected task</p>
          <h2 id="inspector-heading">Edit details</h2>
          {parentNames.length > 0 && (
            <p className="inspector-task-path">{parentNames.join(" › ")}</p>
          )}
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
