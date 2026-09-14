import { isUuid as validUuid } from "../utils/id.ts";
import { GRAPH_COLLECTIONS } from "./graph-patch-service.ts";
import type { GraphPatch, GraphRevision } from "../types/graph-sync.ts";

const isUuid = (value: unknown): value is string => typeof value === "string" && validUuid(value);

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function isGraphRevision(value: unknown): value is GraphRevision {
  return object(value) && isUuid(value.generation) && Number.isSafeInteger(value.sequence) && Number(value.sequence) >= 0;
}
export function isGraphPatch(value: unknown): value is GraphPatch {
  if (!object(value) || !isUuid(value.mutationId) || !isGraphRevision(value.baseRevision) || !Array.isArray(value.operations)) return false;
  return value.operations.every((operation) => {
    if (!object(operation) || !GRAPH_COLLECTIONS.includes(operation.collection as never) || !isUuid(operation.id)) return false;
    if (operation.kind === "delete") return object(operation.before) && operation.before.id === operation.id;
    if (operation.kind === "create") return object(operation.value) && operation.value.id === operation.id &&
      (operation.afterId === null || isUuid(operation.afterId));
    if (operation.kind === "move") return [operation.beforeId, operation.afterId].every((id) => id === null || isUuid(id));
    if (operation.kind !== "update" || !object(operation.fields)) return false;
    return Object.entries(operation.fields).every(([key, change]) =>
      /^(sourceId|targetId|type|properties\.[a-zA-Z][a-zA-Z0-9]*)$/.test(key) &&
      !key.includes("__proto__") && object(change) && Object.keys(change).every((key) => key === "before" || key === "after"));
  });
}
