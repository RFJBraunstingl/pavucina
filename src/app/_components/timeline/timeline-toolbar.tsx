import { rangeLabel } from "@/utils/shared/temporal/date";
import type { TimelineToolbarProps } from "@/types/timeline/timeline";

export default function TimelineToolbar({
  days,
  hideDone,
  onHideDoneChange,
  onCollapseAll,
  onExpandAll,
  onPrevious,
  onToday,
  onNext,
}: TimelineToolbarProps) {
  return (
    <div className="timeline-toolbar">
      <div>
        <p className="eyebrow">Project plan</p>
        <h2 id="timeline-heading">{rangeLabel(days[0], days.at(-1)!)}</h2>
        <div className="tree-actions" aria-label="Task hierarchy">
          <button type="button" onClick={onCollapseAll}>Collapse all</button>
          <button type="button" onClick={onExpandAll}>Expand all</button>
        </div>
      </div>
      <div className="range-controls" aria-label="Timeline range">
        <label className="done-toggle">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(event) => onHideDoneChange(event.target.checked)}
          />
          Hide done
        </label>
        <button type="button" aria-label="Previous four weeks" onClick={onPrevious}>
          ←
        </button>
        <button type="button" className="today-button" onClick={onToday}>
          Today
        </button>
        <button type="button" aria-label="Next four weeks" onClick={onNext}>
          →
        </button>
      </div>
    </div>
  );
}
