import { addDays, daysBetween, isIsoDate } from "../utils/date.ts";
import {
  addDateTime,
  isTime,
  minutesBetweenDateTimes,
} from "../utils/time.ts";
import type {
  DateNode,
  DateRelationshipType,
  Graph,
  TaskNode,
  TimeProperty,
} from "@/types/graph";

const DATE_RELATIONSHIPS: DateRelationshipType[] = [
  "plannedStartDate",
  "plannedEndDate",
];

// ponytail: linear graph scans are enough for local data; index nodes when real datasets make rendering slow.
export function getTaskDate(
  graph: Graph,
  taskId: string,
  type: DateRelationshipType,
) {
  const relationship = graph.relationships.find(
    (item) => item.sourceId === taskId && item.type === type,
  );
  const node = graph.nodes.find(
    (item): item is DateNode =>
      item.id === relationship?.targetId && item.type === "date",
  );
  return node?.properties.value;
}

export function getTaskTime(graph: Graph, taskId: string, type: TimeProperty) {
  const task = graph.nodes.find(
    (node): node is TaskNode => node.id === taskId && node.type === "task",
  );
  return task?.properties[type];
}

function removeUnusedDates(graph: Graph): Graph {
  const usedDates = new Set(
    graph.relationships
      .filter((item) => DATE_RELATIONSHIPS.includes(item.type as DateRelationshipType))
      .map((item) => item.targetId),
  );
  return {
    ...graph,
    nodes: graph.nodes.filter(
      (node) => node.type !== "date" || usedDates.has(node.id),
    ),
  };
}

export function setTaskDate(
  graph: Graph,
  taskId: string,
  type: DateRelationshipType,
  value?: string,
) {
  if (value && !isIsoDate(value)) throw new Error(`Invalid ISO date: ${value}`);
  let nodes = graph.nodes;
  const relationships = graph.relationships.filter(
    (item) => !(item.sourceId === taskId && item.type === type),
  );

  if (value) {
    const target: DateNode = {
      id: `date:${value}`,
      type: "date",
      properties: { value },
    };
    if (!nodes.some((node) => node.id === target.id)) nodes = [...nodes, target];
    relationships.push({
      id: `${type}:${taskId}`,
      type,
      sourceId: taskId,
      targetId: target.id,
    });
  }
  return removeUnusedDates({ ...graph, nodes, relationships });
}

export function setTaskDates(
  graph: Graph,
  taskId: string,
  start: string,
  end: string,
) {
  if (daysBetween(start, end) < 0) throw new Error("Task end precedes start");
  return setTaskDate(
    setTaskDate(graph, taskId, "plannedStartDate", start),
    taskId,
    "plannedEndDate",
    end,
  );
}

export function updateTaskDate(
  graph: Graph,
  taskId: string,
  type: DateRelationshipType,
  value: string,
) {
  if (!value) return setTaskDate(graph, taskId, type);
  const otherType =
    type === "plannedStartDate" ? "plannedEndDate" : "plannedStartDate";
  const other = getTaskDate(graph, taskId, otherType);
  if (!other) return setTaskDates(graph, taskId, value, value);
  if (
    (type === "plannedStartDate" && value > other) ||
    (type === "plannedEndDate" && value < other)
  ) {
    return setTaskDates(graph, taskId, value, value);
  }
  return setTaskDate(graph, taskId, type, value);
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

export function moveTask(graph: Graph, taskId: string, amount: number) {
  const start = getTaskDate(graph, taskId, "plannedStartDate");
  const end = getTaskDate(graph, taskId, "plannedEndDate");
  return start && end
    ? setTaskDates(graph, taskId, addDays(start, amount), addDays(end, amount))
    : graph;
}

export function resizeTask(
  graph: Graph,
  taskId: string,
  edge: "start" | "end",
  amount: number,
) {
  const start = getTaskDate(graph, taskId, "plannedStartDate");
  const end = getTaskDate(graph, taskId, "plannedEndDate");
  if (!start || !end) return graph;
  if (edge === "start") {
    const nextStart = addDays(start, amount);
    return setTaskDates(graph, taskId, nextStart > end ? end : nextStart, end);
  }
  const nextEnd = addDays(end, amount);
  return setTaskDates(graph, taskId, start, nextEnd < start ? start : nextEnd);
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
