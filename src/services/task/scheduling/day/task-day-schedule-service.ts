import { setTaskDates } from "../dates/task-date-range-service.ts";
import { setTaskTime, setTaskTimes } from "../task-time-service.ts";
import { findAvailableStart } from "./task-availability-service.ts";
import { isIsoDate } from "@/utils/shared/temporal/date.ts";
import { DAY_END } from "@/utils/calendar/day-schedule.ts";
import {
  addDateTime,
  isTime,
  minutesToTime,
  timeToMinutes,
} from "@/utils/shared/temporal/time.ts";
import type { Graph, TaskNode } from "@/types/graph/graph";

const DEFAULT_DURATION = 60;

export function taskDuration(task: TaskNode) {
  const { plannedStartTime: start, plannedEndTime: end } = task.properties;
  if (!start || !end || !isTime(start) || !isTime(end)) return undefined;
  const duration = timeToMinutes(end) - timeToMinutes(start);
  return duration > 0 ? duration : undefined;
}

function storedDuration(graph: Graph, taskId: string) {
  const task = graph.nodes.find(
    (node): node is TaskNode => node.type === "task" && node.id === taskId,
  );
  return task ? taskDuration(task) ?? DEFAULT_DURATION : DEFAULT_DURATION;
}

export function scheduleTaskOnDay(graph: Graph, taskId: string, day: string) {
  if (!graph.nodes.some((node) => node.type === "task" && node.id === taskId)) {
    return graph;
  }
  const duration = storedDuration(graph, taskId);
  const start = findAvailableStart(graph, taskId, day, duration);
  if (start === null) {
    const dated = setTaskDates(graph, taskId, day, day);
    const withoutStartTime = setTaskTime(dated, taskId, "plannedStartTime", "");
    return setTaskTime(withoutStartTime, taskId, "plannedEndTime", "");
  }
  const startTime = minutesToTime(start);
  const end = addDateTime(day, startTime, duration);
  return setTaskTimes(
    setTaskDates(graph, taskId, day, end.date),
    taskId,
    startTime,
    end.time,
  );
}

export function scheduleTaskForDay(
  graph: Graph,
  taskId: string,
  date: string,
  startTime: string,
  endTime: string,
) {
  if (!graph.nodes.some((node) => node.type === "task" && node.id === taskId)) {
    return graph;
  }
  if (!isIsoDate(date) || !isTime(startTime) || !isTime(endTime)) {
    throw new Error("Invalid day schedule");
  }
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new Error("Task end time must follow its start time");
  }
  return setTaskTimes(
    setTaskDates(graph, taskId, date, date),
    taskId,
    startTime,
    endTime,
  );
}

export function moveTaskWithinDay(
  graph: Graph,
  taskId: string,
  date: string,
  nextStartTime: string,
) {
  const task = graph.nodes.find(
    (node): node is TaskNode => node.id === taskId && node.type === "task",
  );
  if (!task) return graph;
  const duration = taskDuration(task) ?? DEFAULT_DURATION;
  const start = Math.min(timeToMinutes(nextStartTime), DAY_END - duration);
  return scheduleTaskForDay(
    graph,
    taskId,
    date,
    minutesToTime(start),
    minutesToTime(start + duration),
  );
}
