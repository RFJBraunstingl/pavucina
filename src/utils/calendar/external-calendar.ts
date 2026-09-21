import { calendarPosition } from "./calendar.ts";
import { addDays, isIsoDate, todayIso } from "@/utils/shared/date.ts";
import { minutesToTime } from "@/utils/shared/time.ts";
import type { ExternalCalendarItem } from "@/types/calendar/calendar.ts";
import type {
  CalendarSelection,
  CalendarSource,
  ExternalCalendarEvent,
} from "@/types/calendar/external-calendar.ts";

export const CALENDAR_SOURCES: CalendarSource[] = ["google", "outlook"];
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function isCalendarSource(value: unknown): value is CalendarSource {
  return CALENDAR_SOURCES.includes(value as CalendarSource);
}

export function calendarSourceLabel(source: CalendarSource) {
  return source === "google" ? "Google Calendar" : "Outlook Calendar";
}

export function calendarAuthProvider(source: CalendarSource) {
  return source === "google" ? "google-calendar" : "outlook-calendar";
}

export function defaultCalendarColor(source: CalendarSource) {
  return source === "google" ? "#4285f4" : "#0078d4";
}

export function isCalendarColor(value: unknown): value is string {
  return typeof value === "string" && COLOR_PATTERN.test(value);
}

export function parseCalendarSelections(value: unknown) {
  if (!Array.isArray(value) || value.length > 100) return null;
  const selections: CalendarSelection[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const selection = item as Record<string, unknown>;
    if (
      typeof selection.id !== "string" ||
      !selection.id ||
      selection.id.length > 1024 ||
      typeof selection.name !== "string" ||
      !selection.name.trim() ||
      selection.name.length > 256 ||
      !isCalendarColor(selection.color) ||
      typeof selection.visible !== "boolean"
    ) return null;
    selections.push({
      id: selection.id,
      name: selection.name.trim(),
      color: selection.color.toLowerCase(),
      visible: selection.visible,
    });
  }
  return new Set(selections.map(({ id }) => id)).size === selections.length
    ? selections
    : null;
}

export function externalEventDates(event: ExternalCalendarEvent) {
  if (event.allDay && isIsoDate(event.start) && isIsoDate(event.end)) {
    return { startDate: event.start, endDate: event.end };
  }
  const start = new Date(event.start);
  const end = new Date(event.end);
  return { startDate: todayIso(start), endDate: todayIso(end) };
}

function localDay(value: string, minutes = 0) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
}

export function calendarRange(days: string[]) {
  return {
    start: localDay(days[0]).toISOString(),
    end: localDay(addDays(days.at(-1)!, 1)).toISOString(),
  };
}

export function externalCalendarItems(
  events: ExternalCalendarEvent[],
  days: string[],
) {
  return events.flatMap((event): ExternalCalendarItem[] => {
    if (event.allDay) return [];
    const eventStart = new Date(event.start).getTime();
    const eventEnd = new Date(event.end).getTime();
    return days.flatMap((day) => {
      const visibleStart = localDay(day).getTime();
      const visibleEnd = localDay(addDays(day, 1)).getTime();
      const start = Math.max(eventStart, visibleStart);
      const end = Math.min(eventEnd, visibleEnd);
      if (start >= end) return [];
      const startDate = todayIso(new Date(start));
      const startTime = minutesToTime(
        new Date(start).getHours() * 60 + new Date(start).getMinutes(),
      );
      const endTime = minutesToTime(
        new Date(end).getHours() * 60 + new Date(end).getMinutes(),
      );
      const position = calendarPosition(
        `${event.connectionId}:${event.calendarId}:${event.id}:${day}`,
        startDate,
        todayIso(new Date(end)),
        startTime,
        endTime,
        days[0],
      );
      return position ? [{ ...position, event }] : [];
    });
  });
}

export function allDayEventsForDay(
  events: ExternalCalendarEvent[],
  day: string,
) {
  return events.filter((event) => {
    if (!event.allDay) return false;
    const { startDate, endDate } = externalEventDates(event);
    return startDate <= day && day < endDate;
  });
}
