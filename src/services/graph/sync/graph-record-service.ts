import { GRAPH_COLLECTIONS } from "./graph-patch-service.ts";
import { equalValue } from "@/utils/shared/field-changes.ts";
import { longestStableSubsequence } from "@/utils/shared/stable-subsequence.ts";
import type { Graph } from "@/types/graph/graph.ts";
import type {
  GraphCollection,
  GraphRecord,
} from "@/types/graph/graph-sync.ts";

const ORDER_GAP = 1_024;

export function recordKey(record: Pick<GraphRecord, "collection" | "id">) {
  return `${record.collection}:${record.id}`;
}

function activeCollectionRecords(
  records: GraphRecord[],
  collection: GraphCollection,
) {
  return records
    .filter((record) => record.collection === collection && !record.deleted)
    .sort((left, right) => left.order - right.order);
}

export function recordsGraph(records: GraphRecord[]): Graph {
  const graph: Graph = {
    version: 1,
    nodes: [],
    relationships: [],
    inboxNodes: [],
  };
  for (const collection of GRAPH_COLLECTIONS) {
    const values = activeCollectionRecords(records, collection)
      .sort((left, right) => left.order - right.order ||
        left.id.localeCompare(right.id))
      .map((record) => record.value!);
    Object.assign(graph, { [collection]: values });
  }
  return graph;
}

export function mergeRecords(current: GraphRecord[], changes: GraphRecord[]) {
  const records = new Map(
    current.map((record) => [recordKey(record), record]),
  );
  for (const record of changes) {
    if (record.deleted) records.delete(recordKey(record));
    else records.set(recordKey(record), record);
  }
  return [...records.values()];
}

function orderBetween(previous?: number, next?: number) {
  if (previous === undefined) return (next ?? ORDER_GAP) - ORDER_GAP;
  if (next === undefined) return previous + ORDER_GAP;
  return previous + (next - previous) / 2;
}

function desiredRecordOrders(
  original: GraphRecord[],
  desiredIds: string[],
) {
  const originalById = new Map(original.map((record) => [record.id, record]));
  const stableIds = longestStableSubsequence(
    original.map(({ id }) => id),
    desiredIds,
  );
  const orders = desiredIds.map((id) =>
    stableIds.has(id) ? originalById.get(id)!.order : undefined,
  );
  let needsRebalance = false;

  for (let index = 0; index < orders.length; index++) {
    if (orders[index] !== undefined) continue;
    const previous = orders[index - 1];
    const next = orders.slice(index + 1).find((order) => order !== undefined);
    const order = orderBetween(previous, next);
    if (!Number.isFinite(order) || order === previous || order === next) {
      needsRebalance = true;
    }
    orders[index] = order;
  }
  return needsRebalance
    ? desiredIds.map((_, index) => index * ORDER_GAP)
    : orders as number[];
}

export function changedGraphRecords(before: GraphRecord[], graph: Graph) {
  const changed: GraphRecord[] = [];
  for (const collection of GRAPH_COLLECTIONS) {
    const original = activeCollectionRecords(before, collection);
    const originalById = new Map(
      original.map((record) => [record.id, record]),
    );
    const desired = graph[collection] ?? [];
    const desiredIds = desired.map(({ id }) => id);
    const desiredIdSet = new Set(desiredIds);
    const orders = desiredRecordOrders(original, desiredIds);

    for (const [index, value] of desired.entries()) {
      const existing = originalById.get(value.id);
      const order = orders[index];
      if (!existing ||
        existing.order !== order ||
        !equalValue(existing.value, value)) {
        changed.push({ collection, id: value.id, value, order });
      }
    }
    for (const record of original) {
      if (!desiredIdSet.has(record.id)) {
        changed.push({
          collection,
          id: record.id,
          order: record.order,
          deleted: true,
        });
      }
    }
  }
  return changed;
}
