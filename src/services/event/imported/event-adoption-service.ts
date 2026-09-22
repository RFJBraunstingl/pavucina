import { isCompletionRelationship } from "../completion-service.ts";
import { removeUnusedDates } from "@/services/task/scheduling/task-date-service.ts";
import {
  calendarEventOriginKey,
  isImportedEvent,
} from "@/utils/calendar/events/event.ts";
import type { DateNode, Graph, Relationship } from "@/types/graph/graph.ts";

function importedEventsByOrigin(graph: Graph) {
  return new Map(
    graph.nodes
      .filter(isImportedEvent)
      .map((node) => [
        calendarEventOriginKey(node.properties.externalOrigin),
        node,
      ]),
  );
}

function relationshipsBySource(graph: Graph) {
  const bySource = new Map<string, Relationship[]>();
  for (const relationship of graph.relationships) {
    bySource.set(relationship.sourceId, [
      ...(bySource.get(relationship.sourceId) ?? []),
      relationship,
    ]);
  }
  return bySource;
}

function completionRelationships(
  relationships: Map<string, Relationship[]>,
  sourceId?: string,
) {
  return (relationships.get(sourceId ?? "") ?? [])
    .filter(({ type }) => isCompletionRelationship(type));
}

export function replaceImportedEventSubgraph(
  current: Graph,
  remote: Graph,
  base = current,
) {
  const currentEvents = importedEventsByOrigin(current);
  const baseEvents = importedEventsByOrigin(base);
  const currentRelationships = relationshipsBySource(current);
  const baseRelationships = relationshipsBySource(base);
  const remoteRelationships = relationshipsBySource(remote);
  const removedEventIds = new Set(
    [...currentEvents.values()].map(({ id }) => id),
  );
  const nodes = current.nodes.filter((node) => !removedEventIds.has(node.id));
  const relationships = current.relationships.filter((relationship) =>
    !removedEventIds.has(relationship.sourceId) &&
    !removedEventIds.has(relationship.targetId));
  const datesByValue = new Map(nodes.flatMap((node) =>
    node.type === "date" ? [[node.properties.value, node] as const] : []));

  function appendDateRelationships(
    graph: Graph,
    sourceRelationships: Relationship[],
    sourceId: string,
  ) {
    const datesById = new Map(graph.nodes.flatMap((node) =>
      node.type === "date" ? [[node.id, node] as const] : []));
    for (const relationship of sourceRelationships) {
      const sourceDate = datesById.get(relationship.targetId);
      if (!sourceDate) continue;
      let target: DateNode | undefined = datesByValue.get(
        sourceDate.properties.value,
      );
      if (!target) {
        target = sourceDate;
        datesByValue.set(sourceDate.properties.value, target);
        nodes.push(target);
      }
      relationships.push({
        ...relationship,
        sourceId,
        targetId: target.id,
      });
    }
  }

  for (const [origin, event] of importedEventsByOrigin(remote)) {
    nodes.push(event);
    const remoteEventRelationships = remoteRelationships.get(event.id) ?? [];
    appendDateRelationships(
      remote,
      remoteEventRelationships.filter(
        ({ type }) => !isCompletionRelationship(type),
      ),
      event.id,
    );

    const localCompletion = completionRelationships(
      currentRelationships,
      currentEvents.get(origin)?.id,
    );
    const baseCompletion = completionRelationships(
      baseRelationships,
      baseEvents.get(origin)?.id,
    );
    const completionChangedLocally =
      JSON.stringify(localCompletion) !== JSON.stringify(baseCompletion);
    appendDateRelationships(
      completionChangedLocally ? current : remote,
      completionChangedLocally
        ? localCompletion
        : completionRelationships(remoteRelationships, event.id),
      event.id,
    );
  }
  return removeUnusedDates({ ...current, nodes, relationships });
}
