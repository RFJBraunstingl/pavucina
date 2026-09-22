import { isGraph } from "../core/graph-service.ts";
import { GraphConflictError } from "./graph-conflict-error.ts";
import {
  entityFields,
  equalValue,
  fieldsEntity,
} from "@/utils/shared/field-changes.ts";
import type { Graph } from "@/types/graph/graph.ts";
import type {
  GraphCollection,
  GraphEntity,
  GraphOperation,
  SyncConflict,
} from "@/types/graph/graph-sync.ts";

export const GRAPH_COLLECTIONS: GraphCollection[] = [
  "nodes",
  "relationships",
  "inboxNodes",
];

export function applyGraphOperations(
  graph: Graph,
  operations: GraphOperation[],
  force = false,
): Graph {
  const result = {
    ...graph,
    nodes: [...graph.nodes],
    relationships: [...graph.relationships],
    inboxNodes: [...(graph.inboxNodes ?? [])],
  };
  const conflicts: SyncConflict[] = [];

  for (const operation of operations) {
    const items = result[operation.collection] as GraphEntity[];
    const index = items.findIndex(({ id }) => id === operation.id);
    const current = items[index];
    const conflict = (field: string, mine: unknown, saved: unknown) => {
      conflicts.push({ id: operation.id, field, mine, saved });
    };

    if (operation.kind === "delete") {
      if (current && !force && !equalValue(current, operation.before)) {
        conflict("deleted item", undefined, current);
      } else if (current) {
        items.splice(index, 1);
      }
      continue;
    }

    if (operation.kind === "update") {
      if (!current) {
        conflict("deleted item", operation.fields, undefined);
        continue;
      }
      const fields = entityFields(current);
      for (const [key, change] of Object.entries(operation.fields)) {
        const savedChanged = !equalValue(fields[key], change.before);
        const alreadyApplied = equalValue(fields[key], change.after);
        if (!force && savedChanged && !alreadyApplied) {
          conflict(key, change.after, fields[key]);
        } else {
          fields[key] = change.after;
        }
      }
      items[index] = fieldsEntity(fields) as GraphEntity;
      continue;
    }

    if (operation.kind === "create" && current) {
      if (!equalValue(current, operation.value)) {
        conflict("created item", operation.value, current);
      }
      continue;
    }
    if (operation.kind === "move" && !current) {
      conflict("deleted item", operation.afterId, undefined);
      continue;
    }
    if (operation.kind === "move" && !force) {
      const original = graph[operation.collection] ?? [];
      const originalIndex = original.findIndex(({ id }) => id === operation.id);
      const savedAfterId = original[originalIndex - 1]?.id ?? null;
      if (savedAfterId !== operation.beforeId && savedAfterId !== operation.afterId) {
        conflict("order", operation.afterId, savedAfterId);
        continue;
      }
    }
    if (operation.afterId !== null &&
      !items.some(({ id }) => id === operation.afterId)) {
      conflict("order", operation.afterId, undefined);
      continue;
    }
    if (current) items.splice(index, 1);
    const insertAt = operation.afterId === null
      ? 0
      : items.findIndex(({ id }) => id === operation.afterId) + 1;
    items.splice(
      insertAt,
      0,
      operation.kind === "create" ? operation.value : current,
    );
  }

  if (conflicts.length) throw new GraphConflictError(conflicts);
  if (!isGraph(result)) {
    throw new GraphConflictError([{
      id: "graph",
      field: "relationships or dates",
      mine: "These changes cannot be combined into a valid graph.",
    }]);
  }
  return result;
}
