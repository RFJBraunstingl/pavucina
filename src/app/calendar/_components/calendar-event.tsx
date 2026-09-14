import type { CSSProperties } from "react";

import { compactDateLabel } from "@/utils/date";
import type { CalendarEventProps } from "@/types/calendar";

export default function CalendarEvent({
  item,
  selected,
  locked,
  dayCount = 7,
  onSelect,
  onOpen,
  resizeStart = true,
  resizeEnd = true,
  onDragStart,
  onPointerMove,
  onPointerEnd,
  onKeyDown,
}: CalendarEventProps) {
  const {
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
  const node = "task" in item ? item.task : item.eventNode;
  const laneWidth = 100 / (dayCount * laneCount);
  const endLabel =
    startDate === endDate ? endTime : `${compactDateLabel(endDate)} ${endTime}`;

  return (
    <div
      className={`calendar-event${"eventNode" in item ? " external-calendar-event" : ""}${selected ? " selected" : ""}${
        locked ? " locked" : ""
      }`}
      onFocus={onSelect}
      style={{
        top,
        height,
        left: `calc(${dayIndex * (100 / dayCount) + laneIndex * laneWidth}% + 4px)`,
        width: `calc(${laneWidth}% - 8px)`,
        ...("eventNode" in item && { "--external-calendar-color": item.eventNode.properties.calendarColor }),
      } as CSSProperties}
    >
      {!locked && resizeStart && (
        <button
          type="button"
          className="calendar-resize-handle start"
          aria-label={`Change start time of ${node.properties.name}`}
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
        aria-label={`${locked ? "Select" : "Move"} ${node.properties.name}`}
        title={`${node.properties.name}: ${startDate} ${startTime} to ${endDate} ${endTime}`}
        onClick={onOpen ?? onSelect}
        onPointerDown={locked ? undefined : (event) => onDragStart(event, "move")}
        onPointerMove={locked ? undefined : onPointerMove}
        onPointerUp={locked ? undefined : onPointerEnd}
        onPointerCancel={locked ? undefined : onPointerEnd}
        onKeyDown={locked ? undefined : (event) => onKeyDown(event, "move")}
      >
        <strong>{node.properties.name}</strong>
        {("task" in item || height >= 48) && <span>{startTime} – {endLabel}</span>}
      </button>
      {!locked && resizeEnd && (
        <button
          type="button"
          className="calendar-resize-handle end"
          aria-label={`Change end time of ${node.properties.name}`}
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
