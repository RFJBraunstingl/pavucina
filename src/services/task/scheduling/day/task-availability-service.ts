import { getTaskDate } from "../task-date-service.ts";
import { getTaskTime } from "../task-time-service.ts";
import {
  calendarItemEnd,
  CALENDAR_END,
  CALENDAR_RESIZE_STEP,
} from "@/utils/calendar/calendar.ts";
import { graphCalendarItems } from "@/utils/calendar/events/graph-calendar.ts";
import { timeToMinutes } from "@/utils/shared/temporal/time.ts";
import type { EventNode } from "@/types/calendar/events/event.ts";
import type { Graph } from "@/types/graph/graph.ts";

function taskRange(graph: Graph, taskId: string) {
  const start = timeToMinutes(
    getTaskTime(graph, taskId, "plannedStartTime") ?? "09:00",
  );
  const end = timeToMinutes(
    getTaskTime(graph, taskId, "plannedEndTime") ?? "10:00",
  );
  return [start, Math.max(start + CALENDAR_RESIZE_STEP, end)] as const;
}

export function findAvailableStart(
  graph: Graph,
  taskId: string,
  day: string,
  duration: number,
): number | null {
  const taskRanges = graph.nodes
    .filter((node) => node.type === "task" && node.id !== taskId &&
      getTaskDate(graph, node.id, "plannedStartDate") === day)
    .map((node) => taskRange(graph, node.id));
  const occupiedEventRanges = graphCalendarItems(
    graph,
    graph.nodes.filter((node): node is EventNode => node.type === "event"),
    [day],
  ).map((item) => [timeToMinutes(item.startTime), calendarItemEnd(item)] as const);
  const busy = [...taskRanges, ...occupiedEventRanges]
    .sort(([left], [right]) => left - right);
  let candidate = timeToMinutes("09:00");

  for (const [start, end] of busy) {
    if (end <= candidate) continue;
    if (candidate + duration <= Math.min(start, CALENDAR_END)) return candidate;
    candidate = Math.max(candidate, end);
  }
  return candidate + duration <= CALENDAR_END ? candidate : null;
}
