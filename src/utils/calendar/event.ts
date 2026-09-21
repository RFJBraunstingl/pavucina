import { isCalendarColor, isCalendarSource } from "./external-calendar.ts";
import { isUuid } from "@/utils/shared/id.ts";
import { isTime } from "@/utils/shared/time.ts";
import type { CalendarEventOrigin, EventProperties, ImportedEventNode } from "@/types/calendar/event.ts";
import type { GraphNode } from "@/types/graph/graph.ts";

export function isImportedEvent(node: GraphNode): node is ImportedEventNode {
  return node.type === "event" && node.properties.externalOrigin !== undefined;
}

export const EVENT_TEXT_LIMITS = {
  name: 512,
  description: 32_000,
  location: 2_048,
  calendarName: 256,
  sourceUrl: 2_048,
  providerId: 1_024,
  timeZone: 128,
} as const;

function optionalText(value: unknown, maximum: number) {
  return value === undefined ||
    (typeof value === "string" && value.length <= maximum);
}

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > EVENT_TEXT_LIMITS.timeZone) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function isCalendarProviderId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length <= EVENT_TEXT_LIMITS.providerId;
}

export function isCalendarEventOrigin(value: unknown): value is CalendarEventOrigin {
  if (!value || typeof value !== "object") return false;
  const origin = value as Record<string, unknown>;
  return origin.kind === "calendar" &&
    isCalendarSource(origin.source) &&
    typeof origin.connectionId === "string" && isUuid(origin.connectionId) &&
    [origin.calendarId, origin.eventId].every(isCalendarProviderId);
}

export function calendarEventOriginKey(origin: CalendarEventOrigin) {
  return JSON.stringify([
    origin.source,
    origin.connectionId,
    origin.calendarId,
    origin.eventId,
  ]);
}

export function isEventProperties(value: Record<string, unknown>): value is EventProperties {
  const url = value.sourceUrl;
  let validUrl = optionalText(url, EVENT_TEXT_LIMITS.sourceUrl);
  if (typeof url === "string") {
    try {
      validUrl = validUrl && new URL(url).protocol === "https:";
    } catch {
      validUrl = false;
    }
  }
  const validTimes = value.allDay === true
    ? value.startTime === undefined && value.endTime === undefined
    : typeof value.startTime === "string" && isTime(value.startTime) &&
      typeof value.endTime === "string" && isTime(value.endTime);
  return typeof value.name === "string" && Boolean(value.name.trim()) &&
    value.name.length <= EVENT_TEXT_LIMITS.name &&
    optionalText(value.description, EVENT_TEXT_LIMITS.description) &&
    optionalText(value.location, EVENT_TEXT_LIMITS.location) &&
    typeof value.allDay === "boolean" && validTimes &&
    isTimeZone(value.timeZone) &&
    typeof value.calendarName === "string" && Boolean(value.calendarName.trim()) &&
    value.calendarName.length <= EVENT_TEXT_LIMITS.calendarName &&
    isCalendarColor(value.calendarColor) && validUrl &&
    optionalText(value.providerUpdatedAt, 64) &&
    (value.providerUpdatedAt === undefined ||
      !Number.isNaN(Date.parse(value.providerUpdatedAt as string))) &&
    (value.externalOrigin === undefined || isCalendarEventOrigin(value.externalOrigin));
}
