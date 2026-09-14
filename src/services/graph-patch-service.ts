import { changedFields, entityFields, equalValue, fieldsEntity } from "../utils/field-changes.ts";
import { stableSequence } from "../utils/sequence.ts";
import { isGraph } from "./graph-service.ts";
import type { Graph } from "../types/graph.ts";
import type { GraphCollection, GraphEntity, GraphOperation, SyncConflict } from "../types/graph-sync.ts";

export const GRAPH_COLLECTIONS: GraphCollection[] = ["nodes", "relationships", "inboxNodes"];
export class GraphConflictError extends Error {
  conflicts: SyncConflict[];
  constructor(conflicts: SyncConflict[]) { super("Some changes conflict with saved data."); this.conflicts = conflicts; }
}

export function diffGraph(before: Graph, after: Graph): GraphOperation[] {
  const operations: GraphOperation[] = [];
  for (const collection of GRAPH_COLLECTIONS) {
    const original = before[collection] ?? [];
    const desired = after[collection] ?? [];
    const old = new Map<string, GraphEntity>(original.map((item) => [item.id, item]));
    const ids = new Set(desired.map(({ id }) => id));
    const retained = original.filter(({ id }) => ids.has(id));
    const stable = stableSequence(retained.map(({ id }) => id), desired.map(({ id }) => id));
    for (const value of original) if (!ids.has(value.id)) operations.push({ collection, id: value.id, kind: "delete", before: value });
    for (const [index, value] of desired.entries()) {
      const previous = old.get(value.id);
      const afterId = desired[index - 1]?.id ?? null;
      if (!previous) operations.push({ collection, id: value.id, kind: "create", value, afterId });
      else {
        if (previous !== value) {
          const fields = changedFields(entityFields(previous), entityFields(value));
          if (Object.keys(fields).length) operations.push({ collection, id: value.id, kind: "update", fields });
        }
        if (!stable.has(value.id)) operations.push({ collection, id: value.id, kind: "move",
          beforeId: original[original.findIndex(({ id }) => id === value.id) - 1]?.id ?? null, afterId });
      }
    }
  }
  return operations;
}

export function applyGraphOperations(graph: Graph, operations: GraphOperation[], force = false): Graph {
  const result = { ...graph, nodes: [...graph.nodes], relationships: [...graph.relationships], inboxNodes: [...graph.inboxNodes ?? []] };
  const conflicts: SyncConflict[] = [];
  for (const operation of operations) {
    const items = result[operation.collection] as GraphEntity[];
    const index = items.findIndex(({ id }) => id === operation.id);
    const current = items[index];
    const conflict = (field: string, mine: unknown, saved: unknown) => conflicts.push({ id: operation.id, field, mine, saved });
    if (operation.kind === "delete") {
      if (current && !force && !equalValue(current, operation.before)) conflict("deleted item", undefined, current);
      else if (current) items.splice(index, 1);
    } else if (operation.kind === "update") {
      if (!current) { conflict("deleted item", operation.fields, undefined); continue; }
      const fields = entityFields(current);
      for (const [key, change] of Object.entries(operation.fields)) {
        if (!force && !equalValue(fields[key], change.before) && !equalValue(fields[key], change.after)) conflict(key, change.after, fields[key]);
        else fields[key] = change.after;
      }
      items[index] = fieldsEntity(fields) as GraphEntity;
    } else {
      if (operation.kind === "create" && current) {
        if (!equalValue(current, operation.value)) conflict("created item", operation.value, current);
        continue;
      }
      if (operation.kind === "move" && !current) { conflict("deleted item", operation.afterId, undefined); continue; }
      if (operation.kind === "move" && !force) {
        const original = graph[operation.collection] ?? [];
        const position = original.findIndex(({ id }) => id === operation.id);
        const previous = original[position - 1]?.id ?? null;
        if (previous !== operation.beforeId && previous !== operation.afterId) { conflict("order", operation.afterId, previous); continue; }
      }
      if (operation.afterId !== null && !items.some(({ id }) => id === operation.afterId)) { conflict("order", operation.afterId, undefined); continue; }
      if (current) items.splice(index, 1);
      const insertAt = operation.afterId === null ? 0 : items.findIndex(({ id }) => id === operation.afterId) + 1;
      items.splice(insertAt, 0, operation.kind === "create" ? operation.value : current);
    }
  }
  if (conflicts.length) throw new GraphConflictError(conflicts);
  if (!isGraph(result)) throw new GraphConflictError([{ id: "graph", field: "relationships or dates", mine: "These changes cannot be combined into a valid graph." }]);
  return result;
}
