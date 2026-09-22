import { calendarPosition } from "../calendar.ts";
import { addDays, isIsoDate, todayIso } from "@/utils/shared/temporal/date.ts";
import { minutesToTime } from "@/utils/shared/temporal/time.ts";
import type { ExternalCalendarItem } from "@/types/calendar/calendar-layout.ts";
import type { ExternalCalendarEvent } from "@/types/calendar/events/external-calendar.ts";

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
  const start = days[0];
  const end = days.at(-1);
  if (!start || !end) throw new Error("Calendar range requires at least one day");
  return {
    start: localDay(start).toISOString(),
    end: localDay(addDays(end, 1)).toISOString(),
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
