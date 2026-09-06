import {
  getTaskDate,
  getTaskTime,
  setTaskDates,
  setTaskTimes,
} from "./task-schedule-service.ts";
import { CALENDAR_END, CALENDAR_RESIZE_STEP } from "../utils/calendar.ts";
import { addDateTime, minutesToTime, timeToMinutes } from "../utils/time.ts";
import type { Graph } from "@/types/graph";

const DEFAULT_START = "09:00";
const DEFAULT_END = "10:00";
const DEFAULT_DURATION = 60;

function taskRange(graph: Graph, taskId: string) {
  const start = timeToMinutes(
    getTaskTime(graph, taskId, "plannedStartTime") ?? DEFAULT_START,
  );
  const end = timeToMinutes(
    getTaskTime(graph, taskId, "plannedEndTime") ?? DEFAULT_END,
  );
  return [start, Math.max(start + CALENDAR_RESIZE_STEP, end)] as const;
}

function taskDuration(graph: Graph, taskId: string) {
  const start = getTaskTime(graph, taskId, "plannedStartTime");
  const end = getTaskTime(graph, taskId, "plannedEndTime");
  if (!start || !end) return DEFAULT_DURATION;
  const duration = timeToMinutes(end) - timeToMinutes(start);
  return duration > 0 ? duration : DEFAULT_DURATION;
}

function availableStart(
  graph: Graph,
  taskId: string,
  day: string,
  duration: number,
) {
  // ponytail: graph scans match current storage; index schedules when click latency proves it necessary.
  const busy = graph.nodes
    .filter(
      (node) =>
        node.type === "task" &&
        node.id !== taskId &&
        getTaskDate(graph, node.id, "plannedStartDate") === day,
    )
    .map((node) => taskRange(graph, node.id))
    .sort(([left], [right]) => left - right);
  let candidate = timeToMinutes(DEFAULT_START);

  for (const [start, end] of busy) {
    if (end <= candidate) continue;
    if (candidate + duration <= Math.min(start, CALENDAR_END)) return candidate;
    candidate = Math.max(candidate, end);
  }
  return candidate + duration <= CALENDAR_END
    ? candidate
    : timeToMinutes(DEFAULT_START);
}

export function scheduleTaskOnDay(graph: Graph, taskId: string, day: string) {
  if (!graph.nodes.some((node) => node.type === "task" && node.id === taskId)) {
    return graph;
  }
  const duration = taskDuration(graph, taskId);
  const start = availableStart(graph, taskId, day, duration);
  const startTime = minutesToTime(start);
  const end = addDateTime(day, startTime, duration);
  return setTaskTimes(
    setTaskDates(graph, taskId, day, end.date),
    taskId,
    startTime,
    end.time,
  );
}
