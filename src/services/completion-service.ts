import { getTaskAndDescendantIds } from "./task-tree-service.ts";
import { isIsoDate } from "../utils/date.ts";
import type { CompletionRelationshipType, DateNode, Graph, RelationshipType } from "@/types/graph";

export function isCompletionRelationship(type: RelationshipType): type is CompletionRelationshipType {
  return type === "markedAsDone" || type === "wasMarkedAsDone" || type === "markedAsReopened";
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

export function isNodeDone(graph: Graph, nodeId: string) {
  return graph.relationships.some(
    (relationship) =>
      relationship.sourceId === nodeId && relationship.type === "markedAsDone",
  );
}

function markNodesDone(graph: Graph, nodeIds: Iterable<string>, date: string) {
  const incompleteIds = [...nodeIds].filter(
    (nodeId) => !isNodeDone(graph, nodeId),
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

export function markNodeDone(graph: Graph, nodeId: string, date: string): Graph {
  if (!isIsoDate(date)) throw new Error(`Invalid ISO date: ${date}`);
  const node = graph.nodes.find((node) => node.id === nodeId);
  const ids = node?.type === "event" ? [nodeId] : getTaskAndDescendantIds(graph, nodeId);
  return markNodesDone(graph, ids, date);
}

export function reopenNode(graph: Graph, nodeId: string, date: string): Graph {
  if (!isIsoDate(date)) throw new Error(`Invalid ISO date: ${date}`);
  const completed = graph.relationships.find(
    (relationship) =>
      relationship.sourceId === nodeId && relationship.type === "markedAsDone",
  );
  if (
    !completed ||
    !graph.nodes.some((node) => (node.type === "task" || node.type === "event") && node.id === nodeId)
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
        sourceId: nodeId,
        targetId: target.id,
      },
    ],
  };
}
