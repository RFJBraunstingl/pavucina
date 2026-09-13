import type { CSSProperties } from "react";

import type { ImportedCalendarItem } from "@/types/calendar";

export default function ImportedCalendarEvent({
  item,
  dayCount = 7,
  selected,
  onSelect,
}: {
  item: ImportedCalendarItem;
  dayCount?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { eventNode, dayIndex, laneIndex, laneCount, top, height } = item;
  const laneWidth = 100 / (dayCount * laneCount);
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
      <button type="button" onClick={onSelect}>
        <small>{eventNode.properties.calendarName}</small>
        <strong>{eventNode.properties.name}</strong>
        <span>{item.startTime} – {item.endTime}</span>
      </button>
    </div>
  );
}
