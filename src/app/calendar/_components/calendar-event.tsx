import { compactDateLabel } from "@/utils/date";
import type { CalendarEventProps } from "@/types/calendar";

export default function CalendarEvent({
  item,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onKeyDown,
}: CalendarEventProps) {
  const { task, startDate, endDate, startTime, endTime, dayIndex, top, height } =
    item;
  const endLabel =
    startDate === endDate ? endTime : `${compactDateLabel(endDate)} ${endTime}`;

  return (
    <button
      type="button"
      className="calendar-event"
      style={{
        top,
        height,
        left: `calc(${dayIndex * (100 / 7)}% + 4px)`,
        width: `calc(${100 / 7}% - 8px)`,
      }}
      aria-label={`Move ${task.properties.name}`}
      title={`${task.properties.name}: ${startDate} ${startTime} to ${endDate} ${endTime}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <strong>{task.properties.name}</strong>
      <span>{startTime} – {endLabel}</span>
    </button>
  );
}
