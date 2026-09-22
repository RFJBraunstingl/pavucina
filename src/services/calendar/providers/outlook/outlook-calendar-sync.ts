import { normalizeOutlookCalendarEvent } from "../../core/calendar-event.ts";
import {
  providerObject,
  providerRecords,
  providerText,
} from "../../core/provider-response.ts";
import { OAuthRequestError } from "@/services/http/oauth/oauth-client.ts";
import type {
  CalendarConnectionDocument,
  CalendarEventChange,
  CalendarProviderSync,
  ProviderCalendar,
} from "@/types/calendar/events/external-calendar.ts";
import type { OAuthRequest } from "@/types/auth/oauth.ts";

function graphLink(value: unknown, key: string) {
  const link = providerText(value, key);
  if (!link) return undefined;
  const url = new URL(link);
  if (url.protocol !== "https:" || url.hostname !== "graph.microsoft.com") {
    throw new Error("Outlook returned an invalid synchronization link");
  }
  return link;
}

function checkedGraphLink(link: string) {
  const url = new URL(link);
  if (url.protocol !== "https:" || url.hostname !== "graph.microsoft.com") {
    throw new Error("Stored Outlook synchronization link is invalid");
  }
  return link;
}

async function syncOnce(
  connection: CalendarConnectionDocument,
  calendar: ProviderCalendar,
  request: OAuthRequest,
  rangeStart: string,
  rangeEnd: string,
  cursor?: string,
): Promise<CalendarProviderSync> {
  const changes: CalendarEventChange[] = [];
  const id = encodeURIComponent(calendar.id);
  const first = new URL(
    `https://graph.microsoft.com/v1.0/me/calendars/${id}/calendarView/delta`,
  );
  first.searchParams.set("startDateTime", `${rangeStart}T00:00:00Z`);
  first.searchParams.set("endDateTime", `${rangeEnd}T00:00:00Z`);
  let url: string | undefined = cursor ? checkedGraphLink(cursor) : first.toString();
  let nextCursor: string | undefined;
  while (url) {
    const value: unknown = await (await request(url, {
      headers: {
        Prefer: 'outlook.body-content-type="text", odata.maxpagesize=1000',
      },
    })).json();
    for (const item of providerRecords(value, "value")) {
      const eventId = providerText(item, "id");
      if (!eventId) continue;
      if (providerObject(item, "@removed") ||
        (item as Record<string, unknown>).isCancelled === true) {
        changes.push({ action: "delete", eventId });
        continue;
      }
      const event = normalizeOutlookCalendarEvent(
        connection,
        { ...calendar, visible: true },
        item,
      );
      if (event) changes.push({ action: "upsert", event });
    }
    url = graphLink(value, "@odata.nextLink");
    nextCursor = graphLink(value, "@odata.deltaLink") ?? nextCursor;
  }
  if (!nextCursor) throw new Error("Outlook Calendar did not return a delta link");
  return { changes, cursor: nextCursor, authoritative: !cursor };
}

export async function syncOutlookCalendar(
  connection: CalendarConnectionDocument,
  calendar: ProviderCalendar,
  request: OAuthRequest,
  rangeStart: string,
  rangeEnd: string,
  cursor?: string,
) {
  try {
    return await syncOnce(connection, calendar, request, rangeStart, rangeEnd, cursor);
  } catch (error) {
    if (!(cursor && error instanceof OAuthRequestError && error.status === 410)) {
      throw error;
    }
    return syncOnce(connection, calendar, request, rangeStart, rangeEnd);
  }
}
