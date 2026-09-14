import { nativeEventInput, saveNativeEvent } from "./native-event-service.ts";
import { moveTaskWithinDay } from "./task-day-schedule-service.ts";
import { isTaskSchedulable } from "./task-schedule-mode-service.ts";
import { setTaskTimes } from "./task-schedule-service.ts";
import { CALENDAR_RESIZE_STEP, resizeTimeRange } from "../utils/calendar.ts";
import { addDays } from "../utils/date.ts";
import { addDateTime, minutesBetweenDateTimes } from "../utils/time.ts";
import type { CalendarResizeEdge, EditableCalendarItem } from "../types/calendar.ts";
import type { Graph } from "../types/graph.ts";
import type { ScheduleMode } from "../types/preferences.ts";

function nativeRange(graph: Graph, item: EditableCalendarItem) {
  if (!("eventNode" in item)) return null;
  const event = graph.nodes.find((node) => node.id === item.eventNode.id);
  return event?.type === "event" && !event.properties.externalOrigin && !event.properties.allDay
    ? nativeEventInput(graph, event) : null;
}

export function canRescheduleCalendarItem(
  graph: Graph, item: EditableCalendarItem, scheduleMode: ScheduleMode,
) {
  return "task" in item ? isTaskSchedulable(graph, item.task.id, scheduleMode)
    : Boolean(nativeRange(graph, item));
}

export function calendarResizeEdges(graph: Graph, item: EditableCalendarItem) {
  if ("task" in item) return { resizeStart: true, resizeEnd: true };
  const range = nativeRange(graph, item);
  return {
    resizeStart: range?.startDate === item.startDate,
    resizeEnd: Boolean(range && (range.endDate === item.startDate ||
      (range.endTime === "00:00" && range.endDate === addDays(item.startDate, 1)))),
  };
}

export function moveCalendarItem(
  graph: Graph, item: EditableCalendarItem, date: string, startTime: string,
) {
  if ("task" in item) return moveTaskWithinDay(graph, item.task.id, date, startTime);
  const range = nativeRange(graph, item);
  if (!range) return graph;
  const amount = minutesBetweenDateTimes(item.startDate, item.startTime, date, startTime);
  if (!amount) return graph;
  const start = addDateTime(range.startDate, range.startTime, amount);
  const end = addDateTime(range.endDate, range.endTime, amount);
  return saveNativeEvent(graph, item.eventNode.id, {
    ...range, startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time,
  }, false);
}

export function resizeCalendarItem(
  graph: Graph, item: EditableCalendarItem, edge: CalendarResizeEdge, amount: number,
) {
  if (!amount) return graph;
  if ("task" in item) {
    return setTaskTimes(graph, item.task.id,
      ...resizeTimeRange(item.startTime, item.endTime, edge, amount));
  }
  const range = nativeRange(graph, item);
  const edges = calendarResizeEdges(graph, item);
  if (!range || !(edge === "start" ? edges.resizeStart : edges.resizeEnd)) return graph;
  const duration = minutesBetweenDateTimes(range.startDate, range.startTime, range.endDate, range.endTime);
  const delta = edge === "start" ? Math.min(amount, duration - CALENDAR_RESIZE_STEP)
    : Math.max(amount, CALENDAR_RESIZE_STEP - duration);
  const boundary = edge === "start"
    ? addDateTime(range.startDate, range.startTime, delta)
    : addDateTime(range.endDate, range.endTime, delta);
  return saveNativeEvent(graph, item.eventNode.id, {
    ...range,
    ...(edge === "start" ? { startDate: boundary.date, startTime: boundary.time }
      : { endDate: boundary.date, endTime: boundary.time }),
  }, false);
}
