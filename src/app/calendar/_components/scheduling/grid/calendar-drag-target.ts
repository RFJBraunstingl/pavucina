import { CALENDAR_RESIZE_STEP } from "@/utils/calendar/calendar";
import { calendarGridPoint, calendarStartMinutes, snapCalendarMinutes } from "@/utils/calendar/calendar-pointer";
import { minutesToTime, timeToMinutes } from "@/utils/shared/temporal/time";
import type { CalendarDragState, CalendarDragTarget, CalendarPointerPosition } from "@/types/calendar/calendar-interaction";
import type { EditableCalendarItem } from "@/types/calendar/calendar-layout";

export function calendarPointerTarget(
  active: Pick<CalendarDragState, "item" | "originMinutes" | "mode">,
  event: CalendarPointerPosition,
  days: string[],
  bounds: Pick<DOMRect, "left" | "top" | "width" | "height">,
): CalendarDragTarget {
  const point = calendarGridPoint(event, bounds, days.length);
  const amount = snapCalendarMinutes(point.minutes - active.originMinutes);
  const minutes = calendarStartMinutes(timeToMinutes(active.item.startTime) + amount);
  return {
    date: days[point.dayIndex],
    time: minutesToTime(minutes),
    amount,
    key: active.mode === "move" ? `${days[point.dayIndex]}:${minutes}` : String(amount),
  };
}

export function calendarKeyboardTarget(
  key: string,
  item: EditableCalendarItem,
  days: string[],
) {
  const horizontal = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
  const date = days[item.dayIndex + horizontal];
  if (!date) return null;
  const vertical = key === "ArrowUp" ? -CALENDAR_RESIZE_STEP : key === "ArrowDown" ? CALENDAR_RESIZE_STEP : 0;
  const minutes = calendarStartMinutes(
    timeToMinutes(item.startTime) + vertical,
  );
  return { date, time: minutesToTime(minutes) };
}
