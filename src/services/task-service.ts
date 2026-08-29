import { addDays, daysBetween, isIsoDate } from "../utils/date.ts";
import type {
  DateNode,
  DateRelationshipType,
  FlatTask,
  Graph,
  TaskNode,
} from "@/types/graph";

const DATE_RELATIONSHIPS: DateRelationshipType[] = [
  "plannedStartDate",
  "plannedEndDate",
];

function dateNode(value: string): DateNode {
  return {
    id: `date:${value}`,
    type: "date",
    properties: { value },
  };
}

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
    const target = dateNode(value);
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

export function flattenTasks(graph: Graph): FlatTask[] {
  const tasks = graph.nodes.filter((node): node is TaskNode => node.type === "task");
  const children = new Map<string, string[]>();
  const childIds = new Set<string>();

  for (const relationship of graph.relationships) {
    if (relationship.type !== "child") continue;
    children.set(relationship.sourceId, [
      ...(children.get(relationship.sourceId) ?? []),
      relationship.targetId,
    ]);
    childIds.add(relationship.targetId);
  }

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const result: FlatTask[] = [];
  const visit = (id: string, depth: number) => {
    const task = taskById.get(id);
    if (!task) return;
    result.push({ task, depth });
    for (const childId of children.get(id) ?? []) visit(childId, depth + 1);
  };

  for (const task of tasks) if (!childIds.has(task.id)) visit(task.id, 0);
  return result;
}

export function addChildTask(graph: Graph, parentId: string, childId: string) {
  const parent = graph.nodes.find(
    (node): node is TaskNode => node.id === parentId && node.type === "task",
  );
  if (!parent) return graph;

  let next: Graph = {
    ...graph,
    nodes: [
      ...graph.nodes,
      { id: childId, type: "task", properties: { name: "New task" } },
    ],
    relationships: [
      ...graph.relationships,
      {
        id: `child:${parentId}:${childId}`,
        type: "child",
        sourceId: parentId,
        targetId: childId,
      },
    ],
  };

  for (const type of DATE_RELATIONSHIPS) {
    const value = getTaskDate(graph, parentId, type);
    if (value) next = setTaskDate(next, childId, type, value);
  }
  return next;
}
