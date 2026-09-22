import { GRAPH_COLLECTIONS } from "./graph-patch-service.ts";
import { isUuid as matchesUuid } from "@/utils/shared/id.ts";
import type {
  GraphOperation,
  GraphPatch,
  GraphRevision,
} from "@/types/graph/graph-sync.ts";

const EDITABLE_FIELD =
  /^(sourceId|targetId|type|properties\.[a-zA-Z][a-zA-Z0-9]*)$/;

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && matchesUuid(value);
}

function optionalUuid(value: unknown) {
  return value === null || isUuid(value);
}

function isFieldChanges(value: unknown) {
  return object(value) && Object.entries(value).every(([field, change]) =>
    EDITABLE_FIELD.test(field) &&
    !field.includes("__proto__") &&
    object(change) &&
    Object.keys(change).every((key) => key === "before" || key === "after"),
  );
}

function isGraphOperation(value: unknown): value is GraphOperation {
  if (!object(value) ||
    !GRAPH_COLLECTIONS.includes(value.collection as never) ||
    !isUuid(value.id)) {
    return false;
  }
  if (value.kind === "delete") {
    return object(value.before) && value.before.id === value.id;
  }
  if (value.kind === "create") {
    return object(value.value) &&
      value.value.id === value.id &&
      optionalUuid(value.afterId);
  }
  if (value.kind === "move") {
    return optionalUuid(value.beforeId) && optionalUuid(value.afterId);
  }
  return value.kind === "update" && isFieldChanges(value.fields);
}

export function isGraphRevision(value: unknown): value is GraphRevision {
  return object(value) &&
    isUuid(value.generation) &&
    Number.isSafeInteger(value.sequence) &&
    Number(value.sequence) >= 0;
}

export function isGraphPatch(value: unknown): value is GraphPatch {
  return object(value) &&
    isUuid(value.mutationId) &&
    isGraphRevision(value.baseRevision) &&
    Array.isArray(value.operations) &&
    value.operations.every(isGraphOperation);
}
