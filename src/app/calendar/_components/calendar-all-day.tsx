import type { CSSProperties } from "react";

import { allDayEventsForDay } from "@/utils/external-calendar";
import { importedAllDayEvents } from "@/utils/event-calendar";
import type { ExternalCalendarEvent } from "@/types/external-calendar";
import type { EventNode } from "@/types/event";
import type { Graph } from "@/types/graph";

export default function CalendarAllDay({
  days,
  externalEvents,
  importedEvents,
  graph,
  selectedId,
  onSelect,
}: {
  days: string[];
  externalEvents: ExternalCalendarEvent[];
  importedEvents: EventNode[];
  graph: Graph;
  selectedId: string | null;
  onSelect: (eventId: string) => void;
}) {
  if (!externalEvents.some(({ allDay }) => allDay) &&
    !importedEvents.some(({ properties }) => properties.allDay)) return null;
  return (
    <div className="calendar-all-day">
      <span>All day</span>
      {days.map((day) => (
        <div key={day}>
          {allDayEventsForDay(externalEvents, day).map((event) => (
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
          {importedAllDayEvents(graph, importedEvents, day).map((event) => (
            <button
              type="button"
              className={selectedId === event.id ? "selected" : undefined}
              style={{
                "--external-calendar-color": event.properties.calendarColor,
              } as CSSProperties}
              onClick={() => onSelect(event.id)}
              key={event.id}
            >
              {event.properties.name}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
