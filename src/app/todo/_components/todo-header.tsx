import { compactDateLabel } from "@/utils/shared/temporal/date";
import LoadingIndicator from "@/app/_components/common/loading-indicator";
import type { TodoHeaderProps } from "@/types/timeline/todo";

export default function TodoHeader({
  date,
  disabled,
  loading,
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
          <LoadingIndicator active={loading} label="Loading calendar events…" />
        </h2>
      </div>
      <div className="todo-heading-actions">
        <label className="done-toggle todo-heading-toggle">
          <input
            type="checkbox"
            checked={hideDone}
            disabled={disabled}
            onChange={(event) => onHideDoneChange(event.target.checked)}
          />
          Hide done
        </label>
        <label className="done-toggle todo-heading-toggle">
          <input
            type="checkbox"
            checked={showFullTaskPath}
            disabled={disabled}
            onChange={(event) =>
              onShowFullTaskPathChange(event.target.checked)
            }
          />
          Show full path
        </label>
        <p className="todo-count" aria-live="polite">
          {disabled ? "— of — done" : `${doneCount} of ${itemCount} done`}
        </p>
      </div>
    </header>
  );
}
