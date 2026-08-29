import { getTaskDate } from "@/services/task-schedule-service";
import type { TaskInspectorProps } from "@/types/timeline";

export default function TaskInspector({
  graph,
  selected,
  onNameChange,
  onDateChange,
}: TaskInspectorProps) {
  return (
    <aside className="inspector" aria-labelledby="inspector-heading">
      {selected ? (
        <>
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
