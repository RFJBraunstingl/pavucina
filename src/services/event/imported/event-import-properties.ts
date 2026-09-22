import { importedEventSchedule } from "../event-schedule-service.ts";
import { EVENT_TEXT_LIMITS } from "@/utils/calendar/events/event.ts";
import type { ImportedEventNode } from "@/types/calendar/events/event.ts";
import type {
  CalendarSyncBatch,
  ExternalCalendarEvent,
} from "@/types/calendar/events/external-calendar.ts";

function truncateText(value: string | undefined, limit: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, limit) : undefined;
}

export function importedCalendarMetadata(batch: CalendarSyncBatch) {
  return {
    calendarName: truncateText(
      batch.calendar.name,
      EVENT_TEXT_LIMITS.calendarName,
    ) ?? "Calendar",
    calendarColor: batch.calendar.color,
  };
}

export function importedEventProperties(
  batch: CalendarSyncBatch,
  event: ExternalCalendarEvent,
  timeZone: string,
): ImportedEventNode["properties"] {
  const schedule = importedEventSchedule(event, timeZone);
  return {
    name: truncateText(event.title, EVENT_TEXT_LIMITS.name) ?? "(Busy)",
    description: truncateText(event.description, EVENT_TEXT_LIMITS.description),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    location: truncateText(event.location, EVENT_TEXT_LIMITS.location),
    allDay: event.allDay,
    timeZone,
    ...importedCalendarMetadata(batch),
    sourceUrl: truncateText(event.url, EVENT_TEXT_LIMITS.sourceUrl),
    providerUpdatedAt: event.providerUpdatedAt,
    externalOrigin: {
      kind: "calendar",
      source: batch.source,
      connectionId: batch.connectionId,
      calendarId: batch.calendar.id,
      eventId: event.id,
    },
  };
}
