import type { Graph, Relationship, TaskPlacement } from "@/types/graph";
import type { ScheduleMode } from "@/types/preferences";
import { clearTaskSchedule } from "./task-schedule-mode-service.ts";

function childRelationship(graph: Graph, taskId: string) {
  return graph.relationships.find(
    (relationship) =>
      relationship.type === "child" && relationship.targetId === taskId,
  );
}

function containsTask(graph: Graph, rootId: string, taskId: string) {
  const pending = [rootId];
  const visited = new Set<string>();
  while (pending.length) {
    const parentId = pending.pop()!;
    if (visited.has(parentId)) continue;
    visited.add(parentId);
    for (const relationship of graph.relationships) {
      if (relationship.type !== "child" || relationship.sourceId !== parentId) {
        continue;
      }
      if (relationship.targetId === taskId) return true;
      pending.push(relationship.targetId);
    }
  }
  return false;
}

function alreadyPlaced(
  graph: Graph,
  moving: Relationship,
  target: Relationship,
  parentId: string,
  placement: TaskPlacement,
) {
  if (moving.sourceId !== parentId) return false;
  const siblings = graph.relationships.filter(
    (relationship) =>
      relationship.type === "child" && relationship.sourceId === parentId,
  );
  const movingIndex = siblings.findIndex(({ id }) => id === moving.id);
  const targetIndex = siblings.findIndex(({ id }) => id === target.id);
  if (placement === "inside") return movingIndex === siblings.length - 1;
  return placement === "before"
    ? movingIndex === targetIndex - 1
    : movingIndex === targetIndex + 1;
}

export function placeTask(
  graph: Graph,
  taskId: string,
  targetId: string,
  placement: TaskPlacement,
  scheduleMode: ScheduleMode = "leaf",
) {
  if (taskId === targetId) return graph;
  const moving = childRelationship(graph, taskId);
  const target = childRelationship(graph, targetId);
  if (!moving || !target) return graph;

  const parentId = placement === "inside" ? targetId : target.sourceId;
  if (
    parentId === taskId ||
    containsTask(graph, taskId, parentId) ||
    alreadyPlaced(graph, moving, target, parentId, placement)
  ) {
    return graph;
  }

  const nextGraph =
    placement === "inside" && scheduleMode === "leaf"
      ? clearTaskSchedule(graph, targetId)
      : graph;
  const relationships = nextGraph.relationships.filter(
    ({ id }) => id !== moving.id,
  );
  const next = { ...moving, sourceId: parentId };
  if (placement === "inside") {
    const lastChildIndex = relationships.findLastIndex(
      (relationship) =>
        relationship.type === "child" && relationship.sourceId === targetId,
    );
    const insertAt =
      lastChildIndex < 0 ? relationships.length : lastChildIndex + 1;
    relationships.splice(insertAt, 0, next);
  } else {
    const targetIndex = relationships.findIndex(({ id }) => id === target.id);
    relationships.splice(targetIndex + (placement === "after" ? 1 : 0), 0, next);
  }
  return { ...nextGraph, relationships };
}
