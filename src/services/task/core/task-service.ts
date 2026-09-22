import { removeUnusedDates } from "../scheduling/dates/task-date-service.ts";
import { clearTaskSchedule } from "../scheduling/task-schedule-mode-service.ts";
import { getTaskAndDescendantIds } from "./task-tree-service.ts";
import { ensureRootNode } from "@/services/graph/core/graph-service.ts";
import type { Graph } from "@/types/graph/graph";
import type { ScheduleMode } from "@/types/preferences/preferences";

export {
  flattenTasks,
  getParentTaskIds,
  getParentTaskNames,
} from "./task-tree-service.ts";

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

export function setTaskDescription(
  graph: Graph,
  taskId: string,
  description: string,
) {
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === taskId && node.type === "task"
        ? {
            ...node,
            properties: {
              ...node.properties,
              description: description || undefined,
            },
          }
        : node,
    ),
  };
}

export function deleteTask(graph: Graph, taskId: string) {
  const deletedIds = getTaskAndDescendantIds(graph, taskId);
  if (!deletedIds.size) return graph;

  return removeUnusedDates({
    ...graph,
    nodes: graph.nodes.filter((node) => !deletedIds.has(node.id)),
    relationships: graph.relationships.filter(
      (relationship) =>
        !deletedIds.has(relationship.sourceId) &&
        !deletedIds.has(relationship.targetId),
    ),
  });
}

export function addChildTask(
  graph: Graph,
  parentId: string,
  childId: string,
  scheduleMode: ScheduleMode = "leaf",
): Graph {
  const parent = graph.nodes.find(
    (node) =>
      node.id === parentId && (node.type === "task" || node.type === "root"),
  );
  if (!parent) return graph;
  const nextGraph =
    scheduleMode === "leaf" && parent.type === "task"
      ? clearTaskSchedule(graph, parentId)
      : graph;

  return {
    ...nextGraph,
    nodes: [
      ...nextGraph.nodes,
      { id: childId, type: "task", properties: { name: "New task" } },
    ],
    relationships: [
      ...nextGraph.relationships,
      {
        id: crypto.randomUUID(),
        type: "child",
        sourceId: parentId,
        targetId: childId,
      },
    ],
  };
}

export function addTopLevelTask(graph: Graph, taskId: string) {
  const rootedGraph = ensureRootNode(graph);
  const root = rootedGraph.nodes.find((node) => node.type === "root");
  if (!root) throw new Error("Could not create the workspace root");
  return addChildTask(rootedGraph, root.id, taskId);
}
