import type { CSSProperties } from "react";

import type { GraphCalendarEventProps } from "@/types/calendar/calendar-components";

export default function GraphCalendarEvent({
  item,
  dayCount = 7,
  selected,
  onSelect,
}: GraphCalendarEventProps) {
  const { eventNode, dayIndex, laneIndex, laneCount, top, height } = item;
  const laneWidth = 100 / (dayCount * laneCount);
  const imported = Boolean(eventNode.properties.externalOrigin);
  const label = `${eventNode.properties.name}, ${item.startDate} ${item.startTime} – ${item.endDate} ${item.endTime}`;
  return (
    <div
      className={`external-calendar-event${selected ? " selected" : ""}`}
      style={{
        top,
        height,
        left: `calc(${dayIndex * (100 / dayCount) + laneIndex * laneWidth}% + 4px)`,
        width: `calc(${laneWidth}% - 8px)`,
        "--external-calendar-color": eventNode.properties.calendarColor,
      } as CSSProperties}
    >
      <button type="button" onClick={onSelect} aria-label={label} title={label}>
        {imported && <small>{eventNode.properties.calendarName}</small>}
        <strong>{eventNode.properties.name}</strong>
        {(imported || height >= 48) && <span>{item.startTime} – {item.endTime}</span>}
      </button>
    </div>
  );
}
