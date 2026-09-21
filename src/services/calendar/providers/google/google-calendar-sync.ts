import {
  normalizeGoogleCalendarEvent,
  providerRecords,
  providerText,
} from "../../core/calendar-event.ts";
import { OAuthRequestError } from "@/services/http/oauth-client.ts";
import type {
  CalendarConnectionDocument,
  CalendarEventChange,
  CalendarProviderSync,
  ProviderCalendar,
} from "@/types/calendar/external-calendar.ts";
import type { OAuthRequest } from "@/types/auth/oauth.ts";

async function syncOnce(
  connection: CalendarConnectionDocument,
  calendar: ProviderCalendar,
  request: OAuthRequest,
  rangeStart: string,
  rangeEnd: string,
  timeZone: string,
  cursor?: string,
): Promise<CalendarProviderSync> {
  const changes: CalendarEventChange[] = [];
  let pageToken: string | undefined;
  let nextCursor: string | undefined;
  do {
    const id = encodeURIComponent(calendar.id);
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${id}/events`);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("maxResults", "2500");
    url.searchParams.set("timeZone", timeZone);
    url.searchParams.set(
      "fields",
      "items(id,status,summary,description,location,start,end,htmlLink,updated),nextPageToken,nextSyncToken",
    );
    if (cursor) url.searchParams.set("syncToken", cursor);
    else {
      url.searchParams.set("timeMin", `${rangeStart}T00:00:00Z`);
      url.searchParams.set("timeMax", `${rangeEnd}T00:00:00Z`);
    }
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const value: unknown = await (await request(url.toString())).json();
    for (const item of providerRecords(value, "items")) {
      const eventId = providerText(item, "id");
      if (!eventId) continue;
      if (providerText(item, "status") === "cancelled") {
        changes.push({ action: "delete", eventId });
        continue;
      }
      const event = normalizeGoogleCalendarEvent(
        connection,
        { ...calendar, visible: true },
        item,
      );
      if (event) changes.push({ action: "upsert", event });
    }
    pageToken = providerText(value, "nextPageToken");
    nextCursor = providerText(value, "nextSyncToken") ?? nextCursor;
  } while (pageToken);
  if (!nextCursor) throw new Error("Google Calendar did not return a sync token");
  return { changes, cursor: nextCursor, authoritative: !cursor };
}

export async function syncGoogleCalendar(
  connection: CalendarConnectionDocument,
  calendar: ProviderCalendar,
  request: OAuthRequest,
  rangeStart: string,
  rangeEnd: string,
  timeZone: string,
  cursor?: string,
) {
  try {
    return await syncOnce(
      connection, calendar, request, rangeStart, rangeEnd, timeZone, cursor,
    );
  } catch (error) {
    if (!(cursor && error instanceof OAuthRequestError && error.status === 410)) {
      throw error;
    }
    return syncOnce(connection, calendar, request, rangeStart, rangeEnd, timeZone);
  }
}
