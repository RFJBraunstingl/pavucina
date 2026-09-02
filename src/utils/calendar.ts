import { daysBetween } from "./date.ts";
import { minutesToTime, timeToMinutes } from "./time.ts";
import type { CalendarItem, CalendarResizeEdge } from "@/types/calendar";
import type { TaskNode } from "@/types/graph";

export const CALENDAR_START = 5 * 60;
export const CALENDAR_END = 23 * 60;
export const CALENDAR_RESIZE_STEP = 15;
export const HOUR_HEIGHT = 64;
export const CALENDAR_HEIGHT =
  ((CALENDAR_END - CALENDAR_START) / 60) * HOUR_HEIGHT;
export const HOUR_LABELS = Array.from(
  { length: (CALENDAR_END - CALENDAR_START) / 60 + 1 },
  (_, index) => `${String(index + CALENDAR_START / 60).padStart(2, "0")}:00`,
);

export function resizeTimeRange(
  startTime: string,
  endTime: string,
  edge: CalendarResizeEdge,
  amount: number,
) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return edge === "start"
    ? [
        minutesToTime(
          Math.max(CALENDAR_START, Math.min(start + amount, end - CALENDAR_RESIZE_STEP)),
        ),
        endTime,
      ] as const
    : [
        startTime,
        minutesToTime(
          Math.min(CALENDAR_END, Math.max(end + amount, start + CALENDAR_RESIZE_STEP)),
        ),
      ] as const;
}

export function calendarItem(
  task: TaskNode,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  weekStart: string,
): CalendarItem | null {
  const dayIndex = daysBetween(weekStart, startDate);
  const start = timeToMinutes(startTime);
  if (dayIndex < 0 || dayIndex > 6 || start < CALENDAR_START || start >= CALENDAR_END) {
    return null;
  }
  const duration = Math.max(
    CALENDAR_RESIZE_STEP,
    timeToMinutes(endTime) - start,
  );
  return {
    task,
    startDate,
    endDate,
    startTime,
    endTime,
    dayIndex,
    top: ((start - CALENDAR_START) / 60) * HOUR_HEIGHT,
    height: Math.min(
      Math.max(34, (duration / 60) * HOUR_HEIGHT),
      ((CALENDAR_END - start) / 60) * HOUR_HEIGHT,
    ),
  };
}
