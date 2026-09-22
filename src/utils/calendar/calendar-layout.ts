import { CALENDAR_RESIZE_STEP } from "./calendar";
import { timeToMinutes } from "@/utils/shared/temporal/time";
import type { CalendarLayoutItem } from "@/types/calendar/calendar-layout";

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

    function finishGroup() {
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
    }

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
