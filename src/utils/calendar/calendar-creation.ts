import { calendarItemEnd, CALENDAR_RESIZE_STEP } from "./calendar.ts";
import { addDays } from "@/utils/shared/date.ts";
import { minutesToTime, timeToMinutes } from "@/utils/shared/time.ts";
import type { CalendarLayoutItem } from "@/types/calendar/calendar.ts";
import type { EventTimeRange } from "@/types/calendar/event.ts";

export function calendarFreeGaps(items: CalendarLayoutItem[], date: string) {
  const occupied = items.filter((item) => item.startDate === date)
    .map((item) => [timeToMinutes(item.startTime), calendarItemEnd(item)] as const)
    .sort(([left], [right]) => left - right);
  const gaps: Array<[number, number]> = [];
  let end = 0;
  for (const [start, nextEnd] of occupied) {
    if (start > end) gaps.push([end, start]);
    end = Math.max(end, nextEnd);
  }
  if (end < 1440) gaps.push([end, 1440]);
  return gaps;
}

export function suggestCalendarEvent(
  items: CalendarLayoutItem[], date: string, minute: number,
): EventTimeRange | null {
  if (!Number.isFinite(minute) || minute < 0 || minute >= 1440) return null;
  const gap = calendarFreeGaps(items, date).find(([start, end]) => start <= minute && minute < end);
  if (!gap) return null;
  const [gapStart, gapEnd] = gap;
  const snapped = Math.round(minute / CALENDAR_RESIZE_STEP) * CALENDAR_RESIZE_STEP;
  const first = Math.ceil(gapStart / CALENDAR_RESIZE_STEP) * CALENDAR_RESIZE_STEP;
  const last = (Math.ceil(gapEnd / CALENDAR_RESIZE_STEP) - 1) * CALENDAR_RESIZE_STEP;
  const start = gapEnd - gapStart <= 60 ? gapStart
    : Math.max(first, Math.min(snapped, last));
  const end = Math.min(gapEnd, start + 60);
  return {
    startDate: date, startTime: minutesToTime(start),
    endDate: end === 1440 ? addDays(date, 1) : date, endTime: minutesToTime(end),
  };
}

export function defaultCalendarEvent(items: CalendarLayoutItem[], date: string): EventTimeRange {
  const gap = calendarFreeGaps(items, date).find(([, end]) => end > 9 * 60);
  if (!gap) return { startDate: date, endDate: date, startTime: "09:00", endTime: "10:00" };
  const range = suggestCalendarEvent(items, date, Math.max(gap[0], 9 * 60))!;
  return range.startTime < "09:00" ? { ...range, startTime: "09:00" } : range;
}
