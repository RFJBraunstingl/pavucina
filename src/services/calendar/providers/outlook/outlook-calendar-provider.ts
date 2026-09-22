import { normalizeOutlookCalendarEvent } from "../../core/calendar-event";
import { providerRecords, providerText } from "../../core/provider-response";
import { defaultCalendarColor, isCalendarColor } from "@/utils/calendar/events/external-calendar-source";
import { isCalendarProviderId } from "@/utils/calendar/events/event";
import type {
  CalendarConnectionDocument,
  CalendarSelection,
  ExternalCalendarEvent,
  ProviderCalendar,
} from "@/types/calendar/events/external-calendar";
import type { OAuthRequest } from "@/types/auth/oauth";

function nextLink(value: unknown) {
  const link = providerText(value, "@odata.nextLink");
  if (!link) return undefined;
  const url = new URL(link);
  if (url.protocol !== "https:" || url.hostname !== "graph.microsoft.com") {
    throw new Error("Outlook returned an invalid page link");
  }
  return link;
}

export async function listOutlookCalendars(request: OAuthRequest) {
  const calendars: ProviderCalendar[] = [];
  let url: string | undefined =
    "https://graph.microsoft.com/v1.0/me/calendars?$select=id,name,hexColor&$top=999";
  while (url) {
    const value: unknown = await (await request(url)).json();
    for (const item of providerRecords(value, "value")) {
      const id = providerText(item, "id");
      const name = providerText(item, "name");
      if (!isCalendarProviderId(id) || !name) continue;
      const color = providerText(item, "hexColor");
      calendars.push({
        id,
        name,
        color: isCalendarColor(color)
          ? color.toLowerCase()
          : defaultCalendarColor("outlook"),
      });
    }
    url = nextLink(value);
  }
  return calendars;
}

export async function loadOutlookCalendarEvents(
  connection: CalendarConnectionDocument,
  calendar: CalendarSelection,
  request: OAuthRequest,
  start: string,
  end: string,
) {
  const events: ExternalCalendarEvent[] = [];
  const id = encodeURIComponent(calendar.id);
  const first = new URL(
    `https://graph.microsoft.com/v1.0/me/calendars/${id}/calendarView`,
  );
  first.searchParams.set("startDateTime", start);
  first.searchParams.set("endDateTime", end);
  first.searchParams.set("$select", "id,subject,start,end,isAllDay,isCancelled,webLink");
  first.searchParams.set("$top", "1000");
  let url: string | undefined = first.toString();
  while (url) {
    const value: unknown = await (await request(url)).json();
    events.push(...providerRecords(value, "value").flatMap((item) => {
      const event = normalizeOutlookCalendarEvent(connection, calendar, item);
      return event ? [event] : [];
    }));
    url = nextLink(value);
  }
  return events;
}
