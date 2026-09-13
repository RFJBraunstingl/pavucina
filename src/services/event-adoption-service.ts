import { isCompletionRelationship } from "./completion-service.ts";
import { removeUnusedDates } from "./task-schedule-service.ts";
import { calendarEventOriginKey, isImportedEvent } from "../utils/event.ts";
import type { DateNode, Graph, Relationship } from "../types/graph.ts";

function importedEvents(graph: Graph) {
  return new Map(graph.nodes.filter(isImportedEvent).map((node) =>
    [calendarEventOriginKey(node.properties.externalOrigin), node]));
}

function completionEdges(graph: Graph, id?: string) {
  return graph.relationships.filter((edge) =>
    edge.sourceId === id && isCompletionRelationship(edge.type));
}

export function replaceImportedEventSubgraph(current: Graph, remote: Graph, base = current) {
  const currentEvents = importedEvents(current);
  const baseEvents = importedEvents(base);
  const removedIds = new Set([...currentEvents.values()].map(({ id }) => id));
  const nodes = current.nodes.filter((node) => !removedIds.has(node.id));
  const relationships = current.relationships.filter((edge) =>
    !removedIds.has(edge.sourceId) && !removedIds.has(edge.targetId));
  const dates = new Map(nodes.flatMap((node) => node.type === "date"
    ? [[node.properties.value, node] as const] : []));

  function appendEdges(graph: Graph, edges: Relationship[], sourceId: string) {
    const sourceDates = new Map(graph.nodes.flatMap((node) => node.type === "date"
      ? [[node.id, node] as const] : []));
    for (const edge of edges) {
      const date = sourceDates.get(edge.targetId);
      if (!date) continue;
      let target: DateNode | undefined = dates.get(date.properties.value);
      if (!target) {
        target = date;
        dates.set(date.properties.value, target);
        nodes.push(target);
      }
      relationships.push({ ...edge, sourceId, targetId: target.id });
    }
  }

  // ponytail: scan edges per event; index by source ID if large imports make adoption slow.
  for (const [origin, event] of importedEvents(remote)) {
    nodes.push(event);
    appendEdges(remote, remote.relationships.filter((edge) =>
      edge.sourceId === event.id && !isCompletionRelationship(edge.type)), event.id);
    const localEdges = completionEdges(current, currentEvents.get(origin)?.id);
    const baseEdges = completionEdges(base, baseEvents.get(origin)?.id);
    const changedLocally = JSON.stringify(localEdges) !== JSON.stringify(baseEdges);
    appendEdges(changedLocally ? current : remote,
      changedLocally ? localEdges : completionEdges(remote, event.id), event.id);
  }
  return removeUnusedDates({ ...current, nodes, relationships });
}
