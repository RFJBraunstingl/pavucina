import { compactDateLabel } from "@/utils/shared/temporal/date";
import type { TodoHeaderProps } from "@/types/timeline/todo";

export default function TodoHeader({
  date,
  doneCount,
  itemCount,
  hideDone,
  showFullTaskPath,
  onHideDoneChange,
  onShowFullTaskPathChange,
}: TodoHeaderProps) {
  return (
    <header className="todo-heading">
      <div>
        <p className="eyebrow">Daily checklist</p>
        <h2 id="todo-heading">
          <time dateTime={date}>{compactDateLabel(date)}</time>
        </h2>
      </div>
      <div className="todo-heading-actions">
        <label className="done-toggle todo-heading-toggle">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(event) => onHideDoneChange(event.target.checked)}
          />
          Hide done
        </label>
        <label className="done-toggle todo-heading-toggle">
          <input
            type="checkbox"
            checked={showFullTaskPath}
            onChange={(event) =>
              onShowFullTaskPathChange(event.target.checked)
            }
          />
          Show full path
        </label>
        <p className="todo-count" aria-live="polite">
          {doneCount} of {itemCount} done
        </p>
      </div>
    </header>
  );
}
