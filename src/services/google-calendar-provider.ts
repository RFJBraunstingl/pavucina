import {
  normalizeGoogleCalendarEvent,
  providerRecords,
  providerText,
} from "./calendar-event";
import { defaultCalendarColor, isCalendarColor } from "@/utils/external-calendar";
import type {
  CalendarConnectionDocument,
  CalendarSelection,
  ExternalCalendarEvent,
  ProviderCalendar,
} from "@/types/external-calendar";
import type { OAuthRequest } from "@/types/oauth";

export async function listGoogleCalendars(request: OAuthRequest) {
  const calendars: ProviderCalendar[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("minAccessRole", "reader");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const value: unknown = await (await request(url.toString())).json();
    for (const item of providerRecords(value, "items")) {
      const id = providerText(item, "id");
      const name = providerText(item, "summaryOverride") ?? providerText(item, "summary");
      if (!id || !name) continue;
      const color = providerText(item, "backgroundColor");
      calendars.push({
        id,
        name,
        color: isCalendarColor(color)
          ? color.toLowerCase()
          : defaultCalendarColor("google"),
      });
    }
    pageToken = providerText(value, "nextPageToken");
  } while (pageToken);
  return calendars;
}

export async function loadGoogleCalendarEvents(
  connection: CalendarConnectionDocument,
  calendar: CalendarSelection,
  request: OAuthRequest,
  start: string,
  end: string,
) {
  const events: ExternalCalendarEvent[] = [];
  let pageToken: string | undefined;
  do {
    const id = encodeURIComponent(calendar.id);
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${id}/events`);
    url.searchParams.set("timeMin", start);
    url.searchParams.set("timeMax", end);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "2500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const value: unknown = await (await request(url.toString())).json();
    events.push(...providerRecords(value, "items").flatMap((item) => {
      const event = normalizeGoogleCalendarEvent(connection, calendar, item);
      return event ? [event] : [];
    }));
    pageToken = providerText(value, "nextPageToken");
  } while (pageToken);
  return events;
}
