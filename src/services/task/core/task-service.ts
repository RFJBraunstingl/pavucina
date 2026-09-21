import {
  getTaskDate,
  removeUnusedDates,
} from "../scheduling/task-date-service.ts";
import { clearTaskSchedule } from "../scheduling/task-schedule-mode-service.ts";
import {
  flattenTasks,
  getTaskAndDescendantIds,
} from "./task-tree-service.ts";
import { ensureRootNode } from "@/services/graph/core/graph-service.ts";
import { isTime } from "@/utils/shared/time.ts";
import type { Graph, TimeProperty } from "@/types/graph/graph";
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

export function getLeafTasksForDate(graph: Graph, date: string) {
  const parentIds = new Set(
    graph.relationships
      .filter((relationship) => relationship.type === "child")
      .map((relationship) => relationship.sourceId),
  );
  return flattenTasks(graph)
    .map(({ task }) => task)
    .filter((task) => {
      const start = getTaskDate(graph, task.id, "plannedStartDate");
      const end = getTaskDate(graph, task.id, "plannedEndDate") ?? start;
      return Boolean(
        !parentIds.has(task.id) && start && end && start <= date && date <= end,
      );
    })
    .sort(
      (left, right) =>
        (left.properties.plannedStartTime ?? "24:00").localeCompare(
          right.properties.plannedStartTime ?? "24:00",
        ) || left.properties.name.localeCompare(right.properties.name),
    );
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
  const root = rootedGraph.nodes.find((node) => node.type === "root")!;
  return addChildTask(rootedGraph, root.id, taskId);
}
