import { daysBetween, todayIso } from "@/utils/shared/temporal/date.ts";
import { minutesToTime, timeToMinutes } from "@/utils/shared/temporal/time.ts";
import type {
  CalendarItem,
  CalendarLayoutItem,
} from "@/types/calendar/calendar-layout";
import type { CalendarResizeEdge } from "@/types/calendar/calendar-interaction";
import type { TaskNode } from "@/types/graph/graph";

export const CALENDAR_START = 0;
export const CALENDAR_END = 24 * 60 - 1;
export const CALENDAR_RESIZE_STEP = 15;
export const HOUR_HEIGHT = 128;
export const CALENDAR_HEIGHT = 24 * HOUR_HEIGHT;
export const HOUR_LABELS = Array.from(
  { length: 25 },
  (_, hour) => `${String(hour).padStart(2, "0")}:00`,
);

export function calendarCurrentTimePosition(days: string[], time: Date) {
  const dayIndex = days.indexOf(todayIso(time));
  if (dayIndex < 0) return null;
  const minutes = time.getHours() * 60 + time.getMinutes() + time.getSeconds() / 60;
  return {
    top: minutes / 60 * HOUR_HEIGHT,
    left: `${dayIndex / days.length * 100}%`,
    width: `${100 / days.length}%`,
  };
}

export function calendarItemEnd(item: CalendarLayoutItem) {
  if (item.endDate > item.startDate) return 24 * 60;
  return timeToMinutes(item.endTime);
}

function itemEnd(item: CalendarLayoutItem) {
  return Math.max(
    timeToMinutes(item.startTime) + CALENDAR_RESIZE_STEP,
    calendarItemEnd(item),
  );
}

export function layoutCalendarItems<T extends CalendarLayoutItem>(items: T[]) {
  const positioned = new Map<string, T>();

  for (const dayIndex of new Set(items.map((item) => item.dayIndex))) {
    const sorted = items
      .filter((item) => item.dayIndex === dayIndex)
      .sort(
        (left, right) =>
          timeToMinutes(left.startTime) - timeToMinutes(right.startTime) ||
          itemEnd(right) - itemEnd(left) ||
          left.id.localeCompare(right.id),
      );
    let group: Array<[T, number]> = [];
    let groupEnd = -1;
    let laneEnds: number[] = [];
    const finishGroup = () => {
      for (const [item, laneIndex] of group) {
        positioned.set(item.id, {
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
  return items.map((item) => positioned.get(item.id) ?? item);
}

export function calendarPosition(
  id: string,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  weekStart: string,
): CalendarLayoutItem | null {
  const dayIndex = daysBetween(weekStart, startDate);
  const start = timeToMinutes(startTime);
  if (dayIndex < 0 || dayIndex > 6 || start < CALENDAR_START || start > CALENDAR_END) {
    return null;
  }
  const end = timeToMinutes(endTime);
  const duration = Math.max(
    CALENDAR_RESIZE_STEP,
    endDate > startDate && end === 0 ? 24 * 60 - start : end - start,
  );
  return {
    id,
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
      ((CALENDAR_END + 1 - start) / 60) * HOUR_HEIGHT,
    ),
  };
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
  const position = calendarPosition(
    task.id,
    startDate,
    endDate,
    startTime,
    endTime,
    weekStart,
  );
  return position ? { ...position, task } : null;
}
