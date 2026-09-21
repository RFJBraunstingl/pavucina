import { HOUR_HEIGHT, HOUR_LABELS } from "@/utils/calendar/calendar";
import { isWeekend } from "@/utils/shared/date";
import type { CalendarGridBackgroundProps } from "@/types/calendar/calendar";

export default function CalendarGridBackground({
  days,
  currentTimePosition,
}: CalendarGridBackgroundProps) {
  return (
    <>
      {days.map((day) => (
        <div
          className={`calendar-day${isWeekend(day) ? " weekend" : ""}`}
          key={day}
        />
      ))}
      {HOUR_LABELS.map((time, index) => (
        <div
          className="calendar-hour-line"
          style={{ top: index * HOUR_HEIGHT }}
          key={time}
        />
      ))}
      {currentTimePosition && (
        <div
          className="calendar-current-time"
          style={currentTimePosition}
          aria-hidden="true"
        />
      )}
    </>
  );
}
