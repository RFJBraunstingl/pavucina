import { addDays } from "@/utils/shared/temporal/date.ts";
import type { CalendarEventSyncState } from "@/types/calendar/events/external-calendar.ts";

export function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts();
  const values = new Map(parts.map(({ type, value }) => [type, value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  if (!year || !month || !day) {
    throw new Error(`Could not determine today's date in ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}

export function calendarSyncWindow(
  state: CalendarEventSyncState | undefined,
  today: string,
  timeZone: string,
) {
  if (state && state.timeZone === timeZone && today < state.refreshAfter) {
    return {
      rangeStart: state.rangeStart,
      rangeEnd: state.rangeEnd,
      refreshAfter: state.refreshAfter,
      cursor: state.cursor,
    };
  }
  return {
    rangeStart: addDays(today, -30),
    rangeEnd: addDays(today, 396),
    refreshAfter: addDays(today, 30),
    cursor: undefined,
  };
}
