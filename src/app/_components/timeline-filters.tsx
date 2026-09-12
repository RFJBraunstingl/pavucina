import TimelineFilterField from "./timeline-filter-field";
import type { TimelineFiltersProps } from "@/types/timeline-filter";

export default function TimelineFilters({
  levels,
  active,
  onChange,
  onClear,
}: TimelineFiltersProps) {
  return (
    <section className="timeline-filters" aria-label="Filter task hierarchy">
      <div className="timeline-filter-fields">
        {levels.map((level) => (
          <TimelineFilterField
            level={level}
            onChange={(selectedIds) => onChange(level.depth, selectedIds)}
            key={level.depth}
          />
        ))}
        {active && (
          <button className="timeline-filter-clear" type="button" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}
