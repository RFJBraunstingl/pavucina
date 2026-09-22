import { GRAPH_COLLECTIONS } from "./graph-patch-service.ts";
import {
  changedFields,
  entityFields,
} from "@/utils/shared/field-changes.ts";
import { longestStableSubsequence } from "@/utils/shared/stable-subsequence.ts";
import type { Graph } from "@/types/graph/graph.ts";
import type {
  GraphCollection,
  GraphEntity,
  GraphOperation,
} from "@/types/graph/graph-sync.ts";

function diffCollection(
  collection: GraphCollection,
  original: GraphEntity[],
  desired: GraphEntity[],
) {
  const operations: GraphOperation[] = [];
  const originalById = new Map(original.map((item) => [item.id, item]));
  const originalIndexById = new Map(
    original.map(({ id }, index) => [id, index]),
  );
  const desiredIds = new Set(desired.map(({ id }) => id));
  const retainedIds = original
    .filter(({ id }) => desiredIds.has(id))
    .map(({ id }) => id);
  const stableIds = longestStableSubsequence(
    retainedIds,
    desired.map(({ id }) => id),
  );

  for (const value of original) {
    if (!desiredIds.has(value.id)) {
      operations.push({ collection, id: value.id, kind: "delete", before: value });
    }
  }

  for (const [index, value] of desired.entries()) {
    const previous = originalById.get(value.id);
    const afterId = desired[index - 1]?.id ?? null;
    if (!previous) {
      operations.push({ collection, id: value.id, kind: "create", value, afterId });
      continue;
    }

    if (previous !== value) {
      const fields = changedFields(entityFields(previous), entityFields(value));
      if (Object.keys(fields).length) {
        operations.push({ collection, id: value.id, kind: "update", fields });
      }
    }
    if (!stableIds.has(value.id)) {
      const originalIndex = originalIndexById.get(value.id);
      if (originalIndex === undefined) {
        throw new Error(`Original graph item ${value.id} is missing`);
      }
      operations.push({
        collection,
        id: value.id,
        kind: "move",
        beforeId: original[originalIndex - 1]?.id ?? null,
        afterId,
      });
    }
  }
  return operations;
}

export function diffGraph(before: Graph, after: Graph): GraphOperation[] {
  return GRAPH_COLLECTIONS.flatMap((collection) =>
    diffCollection(
      collection,
      (before[collection] ?? []) as GraphEntity[],
      (after[collection] ?? []) as GraphEntity[],
    ),
  );
}
