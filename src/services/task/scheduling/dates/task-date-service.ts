import { isIsoDate } from "@/utils/shared/temporal/date.ts";
import type {
  DateNode,
  DateRelationshipType,
  Graph,
} from "@/types/graph/graph";

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
