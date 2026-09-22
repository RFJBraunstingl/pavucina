import "server-only";

import { createCalendarRequest } from "./calendar-auth";
import {
  listGoogleCalendars,
  loadGoogleCalendarEvents,
} from "./google/google-calendar-provider";
import {
  listOutlookCalendars,
  loadOutlookCalendarEvents,
} from "./outlook/outlook-calendar-provider";
import type {
  CalendarConnectionDocument,
} from "@/types/calendar/events/external-calendar";

export function listProviderCalendars(
  connection: CalendarConnectionDocument,
  request: ReturnType<typeof createCalendarRequest>,
) {
  return connection.source === "google"
    ? listGoogleCalendars(request)
    : listOutlookCalendars(request);
}

export async function loadCalendarProvider(
  connection: CalendarConnectionDocument,
  start: string,
  end: string,
  includeEvents = true,
) {
  const request = createCalendarRequest(connection);
  const calendars = await listProviderCalendars(connection, request);
  const names = new Map(calendars.map(({ id, name }) => [id, name]));
  const selected = connection.calendars.flatMap((calendar) => {
    const name = names.get(calendar.id);
    return calendar.visible && name ? [{ ...calendar, name }] : [];
  });
  const groups = includeEvents
    ? await Promise.all(selected.map((calendar) =>
        connection.source === "google"
          ? loadGoogleCalendarEvents(connection, calendar, request, start, end)
          : loadOutlookCalendarEvents(connection, calendar, request, start, end)))
    : [];
  return { calendars, events: groups.flat() };
}
