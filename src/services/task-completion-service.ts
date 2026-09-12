import { getTaskDate } from "./task-schedule-service.ts";
import { getTaskAndDescendantIds } from "./task-tree-service.ts";
import { isIsoDate } from "../utils/date.ts";
import type { DateNode, Graph, TaskNode, TaskProperties } from "@/types/graph";

type LegacyTaskProperties = TaskProperties & { done?: boolean };

function withoutLegacyDone(task: TaskNode): TaskNode {
  const properties = { ...task.properties } as LegacyTaskProperties;
  delete properties.done;
  return { ...task, properties };
}

function dateNode(graph: Graph, value: string): DateNode {
  return (
    graph.nodes.find(
      (node): node is DateNode =>
        node.type === "date" && node.properties.value === value,
    ) ?? {
      id: crypto.randomUUID(),
      type: "date",
      properties: { value },
    }
  );
}

export function isTaskDone(graph: Graph, taskId: string) {
  return graph.relationships.some(
    (relationship) =>
      relationship.sourceId === taskId && relationship.type === "markedAsDone",
  );
}

function markTasksDone(graph: Graph, taskIds: Iterable<string>, date: string) {
  const incompleteIds = [...taskIds].filter(
    (taskId) => !isTaskDone(graph, taskId),
  );
  if (!incompleteIds.length) return graph;
  const target = dateNode(graph, date);
  return {
    ...graph,
    nodes: graph.nodes.includes(target) ? graph.nodes : [...graph.nodes, target],
    relationships: [
      ...graph.relationships,
      ...incompleteIds.map((sourceId) => ({
        id: crypto.randomUUID(),
        type: "markedAsDone" as const,
        sourceId,
        targetId: target.id,
      })),
    ],
  };
}

export function markTaskDone(graph: Graph, taskId: string, date: string): Graph {
  if (!isIsoDate(date)) throw new Error(`Invalid ISO date: ${date}`);
  return markTasksDone(graph, getTaskAndDescendantIds(graph, taskId), date);
}

export function reopenTask(graph: Graph, taskId: string, date: string): Graph {
  if (!isIsoDate(date)) throw new Error(`Invalid ISO date: ${date}`);
  const completed = graph.relationships.find(
    (relationship) =>
      relationship.sourceId === taskId && relationship.type === "markedAsDone",
  );
  if (
    !completed ||
    !graph.nodes.some((node) => node.type === "task" && node.id === taskId)
  ) {
    return graph;
  }
  const target = dateNode(graph, date);
  return {
    ...graph,
    nodes: graph.nodes.includes(target) ? graph.nodes : [...graph.nodes, target],
    relationships: [
      ...graph.relationships.map((relationship) =>
        relationship.id === completed.id
          ? { ...relationship, type: "wasMarkedAsDone" as const }
          : relationship,
      ),
      {
        id: crypto.randomUUID(),
        type: "markedAsReopened",
        sourceId: taskId,
        targetId: target.id,
      },
    ],
  };
}

export function migrateTaskCompletion(graph: Graph, today: string): Graph {
  if (!isIsoDate(today)) throw new Error(`Invalid ISO date: ${today}`);
  const legacyDone = graph.nodes.flatMap((node) =>
    node.type === "task" && (node.properties as LegacyTaskProperties).done
      ? [node.id]
      : [],
  );
  const hasLegacyProperties = [...graph.nodes, ...(graph.inboxNodes ?? [])].some(
    (node) => node.type === "task" && "done" in node.properties,
  );
  if (!hasLegacyProperties) return graph;

  let migrated: Graph = {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.type === "task" && "done" in node.properties
        ? withoutLegacyDone(node)
        : node,
    ),
    inboxNodes: graph.inboxNodes?.map((node) =>
      "done" in node.properties ? withoutLegacyDone(node) : node,
    ),
  };
  for (const taskId of legacyDone) {
    migrated = markTasksDone(
      migrated,
      [taskId],
      getTaskDate(graph, taskId, "plannedEndDate") ?? today,
    );
  }
  return migrated;
}
