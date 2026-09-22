import type { CSSProperties } from "react";

import { allDayEventsForDay } from "@/utils/calendar/events/external-calendar-layout";
import { importedAllDayEvents } from "@/utils/calendar/events/graph-calendar";
import type { ExternalCalendarEvent } from "@/types/calendar/events/external-calendar";
import type { EventNode } from "@/types/calendar/events/event";
import type { Graph } from "@/types/graph/graph";

export default function CalendarAllDay({
  days,
  externalEvents,
  importedEvents,
  graph,
  selectedId,
  locked,
  creating,
  onSelect,
  onCreate,
}: {
  days: string[];
  externalEvents: ExternalCalendarEvent[];
  importedEvents: EventNode[];
  graph: Graph;
  selectedId: string | null;
  locked: boolean;
  creating: boolean;
  onSelect: (eventId: string) => void;
  onCreate: (date: string) => void;
}) {
  return (
    <div className="calendar-all-day">
      <span>All day</span>
      {days.map((day) => (
        <div key={day}>
          <button type="button" className="calendar-all-day-create"
            aria-label={`Create all-day event on ${day}`}
            disabled={locked || creating} onClick={() => onCreate(day)}>+ Add</button>
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
