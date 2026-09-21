import {
  CALENDAR_END,
  CALENDAR_HEIGHT,
  CALENDAR_RESIZE_STEP,
  CALENDAR_START,
  HOUR_HEIGHT,
  HOUR_LABELS,
} from "./calendar.ts";
import { minutesToTime, timeToMinutes } from "@/utils/shared/time.ts";
import type { CalendarItem } from "@/types/calendar/calendar";
import type { TaskNode } from "@/types/graph/graph";

export const DAY_START = CALENDAR_START;
export const DAY_END = CALENDAR_END;
export const DAY_HEIGHT = CALENDAR_HEIGHT;
export const DAY_HOUR_LABELS = HOUR_LABELS;

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
    id: task.id,
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
