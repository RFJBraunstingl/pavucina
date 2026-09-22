import { removeUnusedDates } from "@/services/task/scheduling/dates/task-date-service.ts";
import { isImportedEvent } from "@/utils/calendar/events/event.ts";
import type { ImportedEventNode } from "@/types/calendar/events/event.ts";
import type { Graph } from "@/types/graph/graph.ts";

export function removeImportedEvents(
  graph: Graph,
  remove: (event: ImportedEventNode) => boolean = () => true,
) {
  const ids = new Set(graph.nodes.flatMap((node) =>
    isImportedEvent(node) && remove(node) ? [node.id] : []));
  if (!ids.size) return graph;
  return removeUnusedDates({
    ...graph,
    nodes: graph.nodes.filter((node) => !ids.has(node.id)),
    relationships: graph.relationships.filter(
      (edge) => !ids.has(edge.sourceId) && !ids.has(edge.targetId),
    ),
  });
}
