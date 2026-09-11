import type { CSSProperties } from "react";

import { allDayEventsForDay } from "@/utils/external-calendar";
import type { ExternalCalendarEvent } from "@/types/external-calendar";

export default function CalendarAllDay({
  days,
  events,
}: {
  days: string[];
  events: ExternalCalendarEvent[];
}) {
  if (!events.some(({ allDay }) => allDay)) return null;
  return (
    <div className="calendar-all-day">
      <span>All day</span>
      {days.map((day) => (
        <div key={day}>
          {allDayEventsForDay(events, day).map((event) => (
            event.url ? (
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer"
                style={{ "--external-calendar-color": event.color } as CSSProperties}
                title={`Open ${event.title} in ${event.calendarName}`}
                key={`${event.connectionId}:${event.calendarId}:${event.id}`}
              >
                {event.title}
              </a>
            ) : (
              <span
                style={{ "--external-calendar-color": event.color } as CSSProperties}
                key={`${event.connectionId}:${event.calendarId}:${event.id}`}
              >
                {event.title}
              </span>
            )
          ))}
        </div>
      ))}
    </div>
  );
}
