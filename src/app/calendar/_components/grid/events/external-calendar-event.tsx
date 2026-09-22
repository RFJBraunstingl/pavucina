import type { CSSProperties } from "react";

import type { ExternalCalendarItem } from "@/types/calendar/calendar-layout";

export default function ExternalCalendarEvent({
  item,
  dayCount = 7,
}: {
  item: ExternalCalendarItem;
  dayCount?: number;
}) {
  const { event, dayIndex, laneIndex, laneCount, top, height } = item;
  const laneWidth = 100 / (dayCount * laneCount);
  const style = {
    top,
    height,
    left: `calc(${dayIndex * (100 / dayCount) + laneIndex * laneWidth}% + 4px)`,
    width: `calc(${laneWidth}% - 8px)`,
    "--external-calendar-color": event.color,
  } as CSSProperties;
  const contents = (
    <>
      <small>{event.calendarName}</small>
      <strong>{event.title}</strong>
      <span>{item.startTime} – {item.endTime}</span>
    </>
  );

  return (
    <div className="external-calendar-event" style={style}>
      {event.url ? (
        <a
          href={event.url}
          target="_blank"
          rel="noreferrer"
          title={`Open ${event.title} in ${event.calendarName}`}
        >
          {contents}
        </a>
      ) : <div>{contents}</div>}
    </div>
  );
}
