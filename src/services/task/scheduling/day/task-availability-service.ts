import { getTaskDate } from "../task-date-service.ts";
import { getTaskTime } from "../task-time-service.ts";
import {
  calendarItemEnd,
  CALENDAR_END,
  CALENDAR_RESIZE_STEP,
} from "@/utils/calendar/calendar.ts";
import { importedCalendarItems } from "@/utils/calendar/event-calendar.ts";
import { timeToMinutes } from "@/utils/shared/time.ts";
import type { EventNode } from "@/types/calendar/event.ts";
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
  // ponytail: graph scans match current storage; index schedules when click latency proves it necessary.
  const taskRanges = graph.nodes
    .filter((node) => node.type === "task" && node.id !== taskId &&
      getTaskDate(graph, node.id, "plannedStartDate") === day)
    .map((node) => taskRange(graph, node.id));
  // The graph-event projection also handles native events and clips overnight ones.
  const eventRanges = importedCalendarItems(
    graph,
    graph.nodes.filter((node): node is EventNode => node.type === "event"),
    [day],
  ).map((item) => [timeToMinutes(item.startTime), calendarItemEnd(item)] as const);
  const busy = [...taskRanges, ...eventRanges].sort(([left], [right]) => left - right);
  let candidate = timeToMinutes("09:00");

  for (const [start, end] of busy) {
    if (end <= candidate) continue;
    if (candidate + duration <= Math.min(start, CALENDAR_END)) return candidate;
    candidate = Math.max(candidate, end);
  }
  return candidate + duration <= CALENDAR_END ? candidate : null;
}
