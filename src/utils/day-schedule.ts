import { CALENDAR_RESIZE_STEP, HOUR_HEIGHT } from "./calendar.ts";
import { minutesToTime, timeToMinutes } from "./time.ts";
import type { CalendarItem } from "@/types/calendar";
import type { TaskNode } from "@/types/graph";

export const DAY_START = 0;
export const DAY_END = 24 * 60 - 1;
export const DAY_HEIGHT = 24 * HOUR_HEIGHT;
export const DAY_HOUR_LABELS = Array.from(
  { length: 25 },
  (_, hour) => `${String(hour).padStart(2, "0")}:00`,
);

export function dayScheduleItem(
  task: TaskNode,
  date: string,
  startTime: string,
  endTime: string,
): CalendarItem {
  const start = timeToMinutes(startTime);
  const duration = timeToMinutes(endTime) - start;
  const top = (start / 60) * HOUR_HEIGHT;
  return {
    task,
    startDate: date,
    endDate: date,
    startTime,
    endTime,
    dayIndex: 0,
    laneIndex: 0,
    laneCount: 1,
    top,
    height: Math.min(
      Math.max(34, (duration / 60) * HOUR_HEIGHT),
      DAY_HEIGHT - top,
    ),
  };
}

export function droppedTimeRange(offset: number, height: number, duration: number) {
  const safeDuration = Math.min(Math.max(duration, CALENDAR_RESIZE_STEP), DAY_END);
  const raw = (offset / Math.max(height, 1)) * (DAY_END + 1);
  const snapped = Math.round(raw / CALENDAR_RESIZE_STEP) * CALENDAR_RESIZE_STEP;
  const maxStart = Math.floor((DAY_END - safeDuration) / CALENDAR_RESIZE_STEP) * CALENDAR_RESIZE_STEP;
  const start = Math.max(DAY_START, Math.min(snapped, maxStart));
  return [minutesToTime(start), minutesToTime(start + safeDuration)] as const;
}
