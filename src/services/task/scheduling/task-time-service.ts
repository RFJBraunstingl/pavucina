import { getTaskDate } from "./dates/task-date-service.ts";
import { setTaskDates } from "./dates/task-date-range-service.ts";
import {
  addDateTime,
  isTime,
  minutesBetweenDateTimes,
} from "@/utils/shared/temporal/time.ts";
import type { Graph, TaskNode, TimeProperty } from "@/types/graph/graph";

export function getTaskTime(graph: Graph, taskId: string, type: TimeProperty) {
  const task = graph.nodes.find(
    (node): node is TaskNode => node.id === taskId && node.type === "task",
  );
  return task?.properties[type];
}

export function setTaskTime(
  graph: Graph,
  taskId: string,
  type: TimeProperty,
  value: string,
) {
  if (value && !isTime(value)) throw new Error(`Invalid time: ${value}`);
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === taskId && node.type === "task"
        ? {
            ...node,
            properties: { ...node.properties, [type]: value || undefined },
          }
        : node,
    ),
  };
}

export function setTaskTimes(
  graph: Graph,
  taskId: string,
  start: string,
  end: string,
) {
  if (!isTime(start) || !isTime(end)) throw new Error("Invalid task time");
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === taskId && node.type === "task"
        ? {
            ...node,
            properties: {
              ...node.properties,
              plannedStartTime: start,
              plannedEndTime: end,
            },
          }
        : node,
    ),
  };
}

export function moveScheduledTask(
  graph: Graph,
  taskId: string,
  nextStartDate: string,
  nextStartTime: string,
) {
  const startDate = getTaskDate(graph, taskId, "plannedStartDate");
  const endDate = getTaskDate(graph, taskId, "plannedEndDate");
  if (!startDate || !endDate) return graph;
  const startTime = getTaskTime(graph, taskId, "plannedStartTime") ?? "09:00";
  const endTime = getTaskTime(graph, taskId, "plannedEndTime") ?? "10:00";
  const duration = Math.max(
    60,
    minutesBetweenDateTimes(startDate, startTime, endDate, endTime),
  );
  const nextEnd = addDateTime(nextStartDate, nextStartTime, duration);
  return setTaskTimes(
    setTaskDates(graph, taskId, nextStartDate, nextEnd.date),
    taskId,
    nextStartTime,
    nextEnd.time,
  );
}
