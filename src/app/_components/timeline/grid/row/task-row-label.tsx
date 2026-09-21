import type { TaskRowLabelProps } from "@/types/timeline/timeline-task";

export default function TaskRowLabel({
  task,
  depth,
  hasChildren,
  collapsed,
  collapseLocked,
  onSelect,
  onNameChange,
  onToggle,
  onAddChild,
  onOrderStart,
  onOrderMove,
  onOrderEnd,
  onOrderCancel,
  onOrderKey,
}: TaskRowLabelProps) {
  return (
    <div
      className="task-label"
      style={{ paddingLeft: `${18 + Math.min(depth, 8) * 20}px` }}
    >
      <button
        type="button"
        className="task-order"
        aria-label={`Reorder ${task.properties.name}`}
        aria-describedby="task-order-help"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
        title="Drag to reorder"
        onPointerDown={(event) => onOrderStart(event, task.id)}
        onPointerMove={onOrderMove}
        onPointerUp={onOrderEnd}
        onPointerCancel={onOrderCancel}
        onKeyDown={(event) => onOrderKey(event, task.id)}
      >
        <span aria-hidden="true">⠿</span>
      </button>
      {hasChildren ? (
        <button
          type="button"
          className="task-toggle"
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${task.properties.name}`}
          disabled={collapseLocked}
          title={collapseLocked ? "Expanded by the active filter" : undefined}
          onClick={() => onToggle(task.id)}
        >
          <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
        </button>
      ) : (
        <span className="task-toggle" aria-hidden="true" />
      )}
      <input
        key={task.properties.name}
        type="text"
        className="task-name-input"
        aria-label={`Task name: ${task.properties.name}`}
        defaultValue={task.properties.name}
        onFocus={() => onSelect(task.id)}
        onBlur={(event) => {
          if (event.currentTarget.value.trim()) {
            onNameChange(task.id, event.currentTarget.value);
          } else {
            event.currentTarget.value = task.properties.name;
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <button
        type="button"
        className="add-child"
        aria-label={`Add child to ${task.properties.name}`}
        title="Add child task"
        onClick={() => onAddChild(task.id)}
      >
        +
      </button>
    </div>
  );
}
