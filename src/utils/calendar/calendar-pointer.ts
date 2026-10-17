import { CALENDAR_END, CALENDAR_RESIZE_STEP, CALENDAR_START } from "./calendar.ts";
import type { CalendarPointerPosition } from "@/types/calendar/calendar-interaction";

export function calendarGridPoint(
  point: CalendarPointerPosition,
  bounds: Pick<DOMRect, "left" | "top" | "width" | "height">,
  dayCount: number,
) {
  return {
    dayIndex: Math.max(0, Math.min(dayCount - 1,
      Math.floor((point.clientX - bounds.left) / bounds.width * dayCount))),
    minutes: (point.clientY - bounds.top) / bounds.height * (CALENDAR_END + 1),
  };
}

export function snapCalendarMinutes(minutes: number) {
  return Math.round(minutes / CALENDAR_RESIZE_STEP) * CALENDAR_RESIZE_STEP;
}

export function calendarStartMinutes(minutes: number) {
  return Math.max(CALENDAR_START, Math.min(minutes, CALENDAR_END));
}
