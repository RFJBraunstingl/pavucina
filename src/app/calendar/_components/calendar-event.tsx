import { compactDateLabel } from "@/utils/date";
import type { CalendarEventProps } from "@/types/calendar";

export default function CalendarEvent({
  item,
  selected,
  onSelect,
  onDragStart,
  onPointerMove,
  onPointerEnd,
  onKeyDown,
}: CalendarEventProps) {
  const { task, startDate, endDate, startTime, endTime, dayIndex, top, height } =
    item;
  const endLabel =
    startDate === endDate ? endTime : `${compactDateLabel(endDate)} ${endTime}`;

  return (
    <div
      className={`calendar-event ${selected ? "selected" : ""}`}
      onFocus={onSelect}
      style={{
        top,
        height,
        left: `calc(${dayIndex * (100 / 7)}% + 4px)`,
        width: `calc(${100 / 7}% - 8px)`,
      }}
    >
      <button
        type="button"
        className="calendar-resize-handle start"
        aria-label={`Change start time of ${task.properties.name}`}
        onPointerDown={(event) => onDragStart(event, "start")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={(event) => onKeyDown(event, "start")}
      />
      <button
        type="button"
        className="calendar-event-body"
        aria-label={`Move ${task.properties.name}`}
        title={`${task.properties.name}: ${startDate} ${startTime} to ${endDate} ${endTime}`}
        onPointerDown={(event) => onDragStart(event, "move")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={(event) => onKeyDown(event, "move")}
      >
        <strong>{task.properties.name}</strong>
        <span>{startTime} – {endLabel}</span>
      </button>
      <button
        type="button"
        className="calendar-resize-handle end"
        aria-label={`Change end time of ${task.properties.name}`}
        onPointerDown={(event) => onDragStart(event, "end")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={(event) => onKeyDown(event, "end")}
      />
    </div>
  );
}
