import { getTaskDate, setTaskDate } from "./task-schedule-service.ts";
import type { FlatTask, Graph, TaskNode } from "@/types/graph";

export function renameTask(graph: Graph, taskId: string, value: string) {
  const name = value.trim();
  if (!name) return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === taskId && node.type === "task"
        ? { ...node, properties: { ...node.properties, name } }
        : node,
    ),
  };
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

  for (const type of ["plannedStartDate", "plannedEndDate"] as const) {
    const value = getTaskDate(graph, parentId, type);
    if (value) next = setTaskDate(next, childId, type, value);
  }
  return next;
}
