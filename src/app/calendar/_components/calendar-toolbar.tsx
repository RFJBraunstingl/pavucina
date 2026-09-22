import CalendarRangeControls from "./navigation/calendar-range-controls";
import { compactDateLabel, rangeLabel } from "@/utils/shared/temporal/date";
import type { CalendarToolbarProps } from "@/types/calendar/calendar-components";

export default function CalendarToolbar({
  days,
  controls,
  ...rangeControls
}: CalendarToolbarProps) {
  const singleDay = rangeControls.dayCount === 1;
  const hint = rangeControls.locked
    ? "Editing is locked. Unlock to create events, or drag and resize tasks and events."
    : "Click or tap free time to create an event. Drag tasks and events or their edges to reschedule them.";
  return (
    <>
      <div className="timeline-toolbar">
        <div>
          <p className="eyebrow">
            {singleDay ? "Daily plan" : "Weekly plan"}
          </p>
          <h2 id="calendar-heading">
            {singleDay
              ? compactDateLabel(rangeControls.day)
              : rangeLabel(days[0], days.at(-1)!)}
          </h2>
        </div>
        <div className="calendar-toolbar-actions">
          {controls}
          <CalendarRangeControls {...rangeControls} />
        </div>
      </div>
      <p className="calendar-hint">
        {hint}
      </p>
    </>
  );
}
