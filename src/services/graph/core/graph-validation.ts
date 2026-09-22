import { daysBetween } from "@/utils/shared/temporal/date.ts";
import { minutesBetweenDateTimes } from "@/utils/shared/temporal/time.ts";
import type { Graph, GraphNode } from "@/types/graph/graph.ts";

export function hasAcyclicTaskHierarchy(
  nodes: Iterable<GraphNode>,
  children: Map<string, string[]>,
) {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    for (const child of children.get(id) ?? []) if (!visit(child)) return false;
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  for (const node of nodes) {
    if (node.type === "task" && !visit(node.id)) return false;
  }
  return true;
}

export function hasValidGraphDateRanges(
  graph: Graph,
  nodes: Iterable<GraphNode>,
) {
  const dateValues = new Map(graph.nodes.flatMap((node) => node.type === "date"
    ? [[node.id, node.properties.value] as const]
    : []));
  const relationships = new Map(graph.relationships.flatMap((edge) =>
    edge.type === "plannedStartDate" || edge.type === "plannedEndDate" ||
    edge.type === "eventStartDate" || edge.type === "eventEndDate"
      ? [[`${edge.sourceId}:${edge.type}`, dateValues.get(edge.targetId)] as const]
      : []));
  for (const node of nodes) {
    if (node.type !== "task" && node.type !== "event") continue;
    const startType = node.type === "task" ? "plannedStartDate" : "eventStartDate";
    const endType = node.type === "task" ? "plannedEndDate" : "eventEndDate";
    const startDate = relationships.get(`${node.id}:${startType}`);
    const endDate = relationships.get(`${node.id}:${endType}`);
    if (node.type === "event" && (!startDate || !endDate)) return false;
    if (startDate && endDate && daysBetween(startDate, endDate) < 0) return false;
    if (node.type === "event" && !node.properties.externalOrigin &&
      !node.properties.allDay && startDate && endDate &&
      minutesBetweenDateTimes(startDate, node.properties.startTime!,
        endDate, node.properties.endTime!) <= 0) return false;
  }
  return true;
}
