import { HOUR_HEIGHT } from "@/utils/calendar/calendar";
import { minutesBetweenDateTimes, timeToMinutes } from "@/utils/shared/temporal/time";
import type { CalendarCreatePreviewProps } from "@/types/calendar/calendar-components";

export default function CalendarCreatePreview({
  preview,
  days,
}: CalendarCreatePreviewProps) {
  return (
    <div className="calendar-create-preview" aria-hidden="true" style={{
      top: timeToMinutes(preview.startTime) / 60 * HOUR_HEIGHT,
      height: minutesBetweenDateTimes(
        preview.startDate,
        preview.startTime,
        preview.endDate,
        preview.endTime,
      ) / 60 * HOUR_HEIGHT,
      left: `${days.indexOf(preview.startDate) / days.length * 100}%`,
      width: `${100 / days.length}%`,
    }}>
      <strong>+ New event</strong>
      <span>{preview.startTime} – {preview.endTime}</span>
    </div>
  );
}
