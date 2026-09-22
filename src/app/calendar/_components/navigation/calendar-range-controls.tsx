import CalendarEditLock from "../editor/calendar-edit-lock";
import { addDays } from "@/utils/shared/temporal/date";
import type { CalendarRangeControlsProps } from "@/types/calendar/calendar-components";

export default function CalendarRangeControls({
  day,
  dayCount,
  today,
  hideDone,
  locked,
  onHideDone,
  onToggleLock,
  onShowDay,
}: CalendarRangeControlsProps) {
  const singleDay = dayCount === 1;
  const period = singleDay ? "day" : "week";
  return (
    <div className="range-controls" aria-label="Calendar range">
      <label className="done-toggle">
        <input
          type="checkbox"
          checked={hideDone}
          onChange={(event) => onHideDone(event.target.checked)}
        />
        Hide done
      </label>
      {singleDay && (
        <CalendarEditLock locked={locked} onToggle={onToggleLock} />
      )}
      <button
        type="button"
        aria-label={`Previous ${period}`}
        onClick={() => onShowDay(addDays(day, -dayCount))}
      >
        ←
      </button>
      <button
        type="button"
        className="today-button"
        onClick={() => onShowDay(today)}
      >
        Today
      </button>
      <button
        type="button"
        aria-label={`Next ${period}`}
        onClick={() => onShowDay(addDays(day, dayCount))}
      >
        →
      </button>
    </div>
  );
}
