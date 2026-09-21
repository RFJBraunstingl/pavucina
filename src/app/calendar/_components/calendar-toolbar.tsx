import CalendarRangeControls from "./navigation/calendar-range-controls";
import { compactDateLabel, rangeLabel } from "@/utils/shared/date";
import type { CalendarToolbarProps } from "@/types/calendar/calendar";

export default function CalendarToolbar({
  days,
  controls,
  ...rangeControls
}: CalendarToolbarProps) {
  const mobile = rangeControls.dayCount === 1;
  return (
    <>
      <div className="timeline-toolbar">
        <div>
          <p className="eyebrow">{mobile ? "Daily plan" : "Weekly plan"}</p>
          <h2 id="calendar-heading">
            {mobile
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
        {rangeControls.locked
          ? "Editing is locked. Unlock to create events, or drag and resize tasks and events."
          : "Click or tap free time to create an event. Drag tasks and events or their edges to reschedule them."}
      </p>
    </>
  );
}
