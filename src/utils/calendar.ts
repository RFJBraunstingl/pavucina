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

function itemEnd(item: CalendarItem) {
  return Math.max(
    timeToMinutes(item.startTime) + CALENDAR_RESIZE_STEP,
    timeToMinutes(item.endTime),
  );
}

export function layoutCalendarItems(items: CalendarItem[]) {
  const positioned = new Map<string, CalendarItem>();

  for (const dayIndex of new Set(items.map((item) => item.dayIndex))) {
    const sorted = items
      .filter((item) => item.dayIndex === dayIndex)
      .sort(
        (left, right) =>
          timeToMinutes(left.startTime) - timeToMinutes(right.startTime) ||
          itemEnd(right) - itemEnd(left) ||
          left.task.id.localeCompare(right.task.id),
      );
    let group: Array<[CalendarItem, number]> = [];
    let groupEnd = -1;
    let laneEnds: number[] = [];
    const finishGroup = () => {
      for (const [item, laneIndex] of group) {
        positioned.set(item.task.id, {
          ...item,
          laneIndex,
          laneCount: laneEnds.length,
        });
      }
      group = [];
      groupEnd = -1;
      laneEnds = [];
    };

    for (const item of sorted) {
      const start = timeToMinutes(item.startTime);
      const end = itemEnd(item);
      if (group.length && start >= groupEnd) finishGroup();
      let laneIndex = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (laneIndex < 0) laneIndex = laneEnds.length;
      laneEnds[laneIndex] = end;
      group.push([item, laneIndex]);
      groupEnd = Math.max(groupEnd, end);
    }
    if (group.length) finishGroup();
  }
  return items.map((item) => positioned.get(item.task.id) ?? item);
}

export function resizeTimeRange(
  startTime: string,
  endTime: string,
  edge: CalendarResizeEdge,
  amount: number,
  minimum = CALENDAR_START,
  maximum = CALENDAR_END,
) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return edge === "start"
    ? [
        minutesToTime(
          Math.max(minimum, Math.min(start + amount, end - CALENDAR_RESIZE_STEP)),
        ),
        endTime,
      ] as const
    : [
        startTime,
        minutesToTime(
          Math.min(maximum, Math.max(end + amount, start + CALENDAR_RESIZE_STEP)),
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
    laneIndex: 0,
    laneCount: 1,
    top: ((start - CALENDAR_START) / 60) * HOUR_HEIGHT,
    height: Math.min(
      Math.max(34, (duration / 60) * HOUR_HEIGHT),
      ((CALENDAR_END - start) / 60) * HOUR_HEIGHT,
    ),
  };
}
