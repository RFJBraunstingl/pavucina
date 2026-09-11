import "server-only";

import { loadCalendarProvider } from "./calendar-provider";
import { listCalendarConnections } from "./calendar-repository";
import type {
  CalendarConnectionSummary,
  CalendarOption,
  ExternalCalendarEvent,
} from "@/types/external-calendar";

export async function loadExternalCalendars(
  userId: string,
  start: string,
  end: string,
) {
  const connections = await listCalendarConnections(userId);
  const results = await Promise.all(connections.map(async (connection) => {
    try {
      const loaded = await loadCalendarProvider(connection, start, end);
      const selected = new Map(connection.calendars.map((item) => [item.id, item]));
      const calendars: CalendarOption[] = loaded.calendars.map((calendar) => {
        const saved = selected.get(calendar.id);
        return saved
          ? { ...saved, name: calendar.name, selected: true }
          : { ...calendar, visible: false, selected: false };
      });
      return {
        summary: {
          id: connection._id,
          source: connection.source,
          address: connection.address,
          status: "connected" as const,
          calendars,
        },
        events: loaded.events,
      };
    } catch (error) {
      return {
        summary: {
          id: connection._id,
          source: connection.source,
          address: connection.address,
          status: "error" as const,
          error: error instanceof Error ? error.message : "Could not load calendars",
          calendars: connection.calendars.map((item) => ({
            ...item,
            selected: true,
          })),
        },
        events: [] as ExternalCalendarEvent[],
      };
    }
  }));
  return {
    connections: results.map(({ summary }) => summary) satisfies CalendarConnectionSummary[],
    events: results.flatMap(({ events }) => events),
  };
}
