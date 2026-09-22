import CalendarEditLock from "../editor/calendar-edit-lock";
import { addDays } from "@/utils/shared/temporal/date";
import type { CalendarRangeControlsProps } from "@/types/calendar/calendar-components";

export default function CalendarRangeControls(props: CalendarRangeControlsProps) {
  const mobile = props.dayCount === 1;
  const period = mobile ? "day" : "week";
  return (
    <div className="range-controls" aria-label="Calendar range">
      <label className="done-toggle">
        <input type="checkbox" checked={props.hideDone}
          onChange={(event) => props.onHideDone(event.target.checked)} />
        Hide done
      </label>
      {mobile && <CalendarEditLock locked={props.locked} onToggle={props.onToggleLock} />}
      <button type="button" aria-label={`Previous ${period}`}
        onClick={() => props.onShowDay(addDays(props.day, -props.dayCount))}>←</button>
      <button type="button" className="today-button" onClick={() => props.onShowDay(props.today)}>Today</button>
      <button type="button" aria-label={`Next ${period}`}
        onClick={() => props.onShowDay(addDays(props.day, props.dayCount))}>→</button>
    </div>
  );
}
