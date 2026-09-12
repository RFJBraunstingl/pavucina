import { compactDateLabel } from "@/utils/date";
import type { CalendarEventProps } from "@/types/calendar";

export default function CalendarEvent({
  item,
  selected,
  locked,
  dayCount = 7,
  onSelect,
  onDragStart,
  onPointerMove,
  onPointerEnd,
  onKeyDown,
}: CalendarEventProps) {
  const {
    task,
    startDate,
    endDate,
    startTime,
    endTime,
    dayIndex,
    laneIndex,
    laneCount,
    top,
    height,
  } = item;
  const laneWidth = 100 / (dayCount * laneCount);
  const endLabel =
    startDate === endDate ? endTime : `${compactDateLabel(endDate)} ${endTime}`;

  return (
    <div
      className={`calendar-event${selected ? " selected" : ""}${
        locked ? " locked" : ""
      }`}
      onFocus={onSelect}
      style={{
        top,
        height,
        left: `calc(${dayIndex * (100 / dayCount) + laneIndex * laneWidth}% + 4px)`,
        width: `calc(${laneWidth}% - 8px)`,
      }}
    >
      {!locked && (
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
      )}
      <button
        type="button"
        className="calendar-event-body"
        aria-label={`${locked ? "Select" : "Move"} ${task.properties.name}`}
        title={`${task.properties.name}: ${startDate} ${startTime} to ${endDate} ${endTime}`}
        onClick={onSelect}
        onPointerDown={locked ? undefined : (event) => onDragStart(event, "move")}
        onPointerMove={locked ? undefined : onPointerMove}
        onPointerUp={locked ? undefined : onPointerEnd}
        onPointerCancel={locked ? undefined : onPointerEnd}
        onKeyDown={locked ? undefined : (event) => onKeyDown(event, "move")}
      >
        <strong>{task.properties.name}</strong>
        <span>{startTime} – {endLabel}</span>
      </button>
      {!locked && (
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
      )}
    </div>
  );
}
