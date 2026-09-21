import { addDays, daysBetween, isIsoDate } from "@/utils/shared/date.ts";
import type {
  DateNode,
  DateRelationshipType,
  Graph,
} from "@/types/graph/graph";

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

export function removeUnusedDates(graph: Graph): Graph {
  const usedDates = new Set(
    graph.relationships
      .filter((item) => item.type !== "child")
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
  const currentRelationship = graph.relationships.find(
    (item) => item.sourceId === taskId && item.type === type,
  );
  const currentDate = graph.nodes.find(
    (node): node is DateNode =>
      node.id === currentRelationship?.targetId && node.type === "date",
  );
  if (currentDate?.properties.value === value || (!currentRelationship && !value)) {
    return graph;
  }

  let nodes = graph.nodes;
  const relationships = graph.relationships.filter(
    (item) => !(item.sourceId === taskId && item.type === type),
  );
  if (value) {
    const target = nodes.find(
      (node): node is DateNode =>
        node.type === "date" && node.properties.value === value,
    ) ?? {
      id: crypto.randomUUID(),
      type: "date",
      properties: { value },
    } satisfies DateNode;
    if (!nodes.includes(target)) nodes = [...nodes, target];
    relationships.push({
      id: crypto.randomUUID(),
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
