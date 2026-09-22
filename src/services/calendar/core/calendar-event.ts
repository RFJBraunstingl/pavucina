import { providerRecord, providerText } from "./provider-response.ts";
import { isIsoDate } from "@/utils/shared/temporal/date.ts";
import { isCalendarProviderId } from "@/utils/calendar/events/event.ts";
import type {
  CalendarConnectionDocument,
  CalendarSelection,
  ExternalCalendarEvent,
} from "@/types/calendar/events/external-calendar";

function httpsUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function timedValue(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function outlookTime(value: unknown) {
  const dateTime = providerRecord(value)?.dateTime;
  if (typeof dateTime !== "string") return null;
  return timedValue(/[zZ]|[+-]\d\d:\d\d$/.test(dateTime) ? dateTime : `${dateTime}Z`);
}

function eventBase(
  connection: CalendarConnectionDocument,
  calendar: CalendarSelection,
  id: string,
  title: unknown,
  url: unknown,
  details: {
    description?: unknown;
    location?: unknown;
    providerUpdatedAt?: unknown;
  } = {},
) {
  return {
    id,
    connectionId: connection._id,
    calendarId: calendar.id,
    calendarName: calendar.name,
    title: typeof title === "string" && title.trim() ? title.trim() : "(Busy)",
    color: calendar.color,
    url: httpsUrl(url),
    description: typeof details.description === "string"
      ? details.description
      : undefined,
    location: typeof details.location === "string"
      ? details.location
      : undefined,
    providerUpdatedAt: timedValue(details.providerUpdatedAt) ?? undefined,
  };
}

export function normalizeGoogleCalendarEvent(
  connection: CalendarConnectionDocument,
  calendar: CalendarSelection,
  value: unknown,
): ExternalCalendarEvent | null {
  const event = providerRecord(value);
  const start = providerRecord(event?.start);
  const end = providerRecord(event?.end);
  if (!event || event.status === "cancelled" || !isCalendarProviderId(event.id)) {
    return null;
  }
  const base = eventBase(connection, calendar, event.id, event.summary, event.htmlLink, {
    description: event.description,
    location: event.location,
    providerUpdatedAt: event.updated,
  });
  if (
    typeof start?.date === "string" &&
    typeof end?.date === "string" &&
    isIsoDate(start.date) &&
    isIsoDate(end.date) &&
    start.date < end.date
  ) return { ...base, allDay: true, start: start.date, end: end.date };
  const startTime = timedValue(start?.dateTime);
  const endTime = timedValue(end?.dateTime);
  return startTime && endTime && startTime < endTime
    ? { ...base, allDay: false, start: startTime, end: endTime }
    : null;
}

export function normalizeOutlookCalendarEvent(
  connection: CalendarConnectionDocument,
  calendar: CalendarSelection,
  value: unknown,
): ExternalCalendarEvent | null {
  const event = providerRecord(value);
  if (!event || event.isCancelled === true || !isCalendarProviderId(event.id)) {
    return null;
  }
  const base = eventBase(connection, calendar, event.id, event.subject, event.webLink, {
    description: providerRecord(event.body)?.content,
    location: providerRecord(event.location)?.displayName,
    providerUpdatedAt: event.lastModifiedDateTime,
  });
  if (event.isAllDay === true) {
    const start = providerText(event.start, "dateTime")?.slice(0, 10);
    const end = providerText(event.end, "dateTime")?.slice(0, 10);
    return start && end && isIsoDate(start) && isIsoDate(end) && start < end
      ? { ...base, allDay: true, start, end }
      : null;
  }
  const start = outlookTime(event.start);
  const end = outlookTime(event.end);
  return start && end && start < end
    ? { ...base, allDay: false, start, end }
    : null;
}
