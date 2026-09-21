import type { PointerEvent } from "react";

import {
  CALENDAR_END,
  CALENDAR_RESIZE_STEP,
  CALENDAR_START,
  HOUR_HEIGHT,
} from "@/utils/calendar/calendar";
import { minutesToTime, timeToMinutes } from "@/utils/shared/time";
import type {
  CalendarDragState,
  EditableCalendarItem,
} from "@/types/calendar/calendar";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export function calendarResizeAmount(offsetY: number) {
  return Math.round(offsetY / (HOUR_HEIGHT / 4)) * CALENDAR_RESIZE_STEP;
}

export function calendarPointerTarget(
  active: CalendarDragState,
  event: PointerEvent<HTMLElement>,
  days: string[],
  calendarWidth: number,
) {
  const dayWidth = calendarWidth / days.length;
  const dayIndex = clamp(
    active.startDayIndex +
      Math.round((event.clientX - active.originX) / dayWidth),
    0,
    days.length - 1,
  );
  const minutes = clamp(
    timeToMinutes(active.startTime) +
      Math.round((event.clientY - active.originY) / (HOUR_HEIGHT / 2)) * 30,
    CALENDAR_START,
    CALENDAR_END - 30,
  );
  return {
    date: days[dayIndex],
    time: minutesToTime(minutes),
    key: `${days[dayIndex]}:${minutes}`,
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
  const vertical = key === "ArrowUp" ? -30 : key === "ArrowDown" ? 30 : 0;
  const minutes = clamp(
    timeToMinutes(item.startTime) + vertical,
    CALENDAR_START,
    CALENDAR_END - 30,
  );
  return { date, time: minutesToTime(minutes) };
}
