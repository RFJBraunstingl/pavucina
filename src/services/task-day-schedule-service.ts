import {
  getTaskDate,
  setTaskDates,
  setTaskTimes,
} from "./task-schedule-service.ts";
import { flattenTasks, setTaskTime } from "./task-service.ts";
import { findAvailableStart } from "./task-availability-service.ts";
import { isNodeDone } from "./completion-service.ts";
import { isTaskSchedulable } from "./task-schedule-mode-service.ts";
import { layoutCalendarItems } from "../utils/calendar.ts";
import { isIsoDate } from "../utils/date.ts";
import { dayScheduleItem, DAY_END } from "../utils/day-schedule.ts";
import {
  addDateTime,
  isTime,
  minutesToTime,
  timeToMinutes,
} from "../utils/time.ts";
import type { Graph, TaskNode } from "@/types/graph";
import type { ScheduleMode } from "@/types/preferences";
import type { DaySchedule } from "@/types/schedule";

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

export function getDaySchedule(
  graph: Graph,
  date: string,
  scheduleMode: ScheduleMode,
  hideDone: boolean,
): DaySchedule {
  const events = [];
  const unscheduled = [];
  for (const { task } of flattenTasks(graph)) {
    if (!isTaskSchedulable(graph, task.id, scheduleMode)) continue;
    if (hideDone && isNodeDone(graph, task.id)) continue;
    const startDate = getTaskDate(graph, task.id, "plannedStartDate");
    const endDate = getTaskDate(graph, task.id, "plannedEndDate");
    if (!startDate || !endDate || date < startDate || date > endDate) continue;
    const duration = taskDuration(task);
    if (startDate === date && endDate === date && duration) {
      events.push(
        dayScheduleItem(
          task,
          date,
          task.properties.plannedStartTime!,
          task.properties.plannedEndTime!,
        ),
      );
    } else {
      unscheduled.push({ task, startDate, endDate });
    }
  }
  return { events: layoutCalendarItems(events), unscheduled };
}

export function getOverdueTasks(
  graph: Graph,
  today: string,
  scheduleMode: ScheduleMode,
) {
  return flattenTasks(graph)
    .flatMap(({ task }) => {
      if (
        isNodeDone(graph, task.id) ||
        !isTaskSchedulable(graph, task.id, scheduleMode)
      ) {
        return [];
      }
      const startDate = getTaskDate(graph, task.id, "plannedStartDate");
      const endDate = getTaskDate(graph, task.id, "plannedEndDate");
      return startDate && endDate && endDate < today
        ? [{ task, startDate, endDate }]
        : [];
    })
    .sort(
      (left, right) =>
        left.endDate.localeCompare(right.endDate) ||
        left.task.properties.name.localeCompare(right.task.properties.name),
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
