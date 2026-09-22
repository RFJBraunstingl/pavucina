import {
  getTaskDate,
  setTaskDate,
} from "./task-date-service.ts";
import { addDays, daysBetween } from "@/utils/shared/temporal/date.ts";
import type { DateRelationshipType, Graph } from "@/types/graph/graph";

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
  const invalidRange =
    (type === "plannedStartDate" && value > other) ||
    (type === "plannedEndDate" && value < other);
  return invalidRange
    ? setTaskDates(graph, taskId, value, value)
    : setTaskDate(graph, taskId, type, value);
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
