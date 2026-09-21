import { GRAPH_COLLECTIONS } from "./graph-patch-service.ts";
import { equalValue } from "@/utils/shared/field-changes.ts";
import { stableSequence } from "@/utils/shared/sequence.ts";
import type { Graph } from "@/types/graph/graph.ts";
import type { GraphRecord } from "@/types/graph/graph-sync.ts";

export const recordKey = (record: Pick<GraphRecord, "collection" | "id">) => `${record.collection}:${record.id}`;
export function recordsGraph(records: GraphRecord[]): Graph {
  const graph: Graph = { version: 1, nodes: [], relationships: [], inboxNodes: [] };
  for (const collection of GRAPH_COLLECTIONS) {
    const values = records.filter((record) => record.collection === collection && !record.deleted)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map((record) => record.value!);
    Object.assign(graph, { [collection]: values });
  }
  return graph;
}

export function mergeRecords(current: GraphRecord[], changes: GraphRecord[]) {
  const records = new Map(current.map((record) => [recordKey(record), record]));
  for (const record of changes) {
    if (record.deleted) records.delete(recordKey(record));
    else records.set(recordKey(record), record);
  }
  return [...records.values()];
}

export function changedGraphRecords(before: GraphRecord[], graph: Graph) {
  const changed: GraphRecord[] = [];
  for (const collection of GRAPH_COLLECTIONS) {
    const original = before.filter((record) => record.collection === collection && !record.deleted).sort((a, b) => a.order - b.order);
    const old = new Map(original.map((record) => [record.id, record]));
    const desired = graph[collection] ?? [];
    const ids = new Set(desired.map(({ id }) => id));
    const stable = stableSequence(original.map(({ id }) => id), [...ids]);
    const orders = desired.map(({ id }) => stable.has(id) ? old.get(id)!.order : undefined);
    let rebalance = false;
    for (let index = 0; index < orders.length; index++) {
      if (orders[index] !== undefined) continue;
      const previous = orders[index - 1];
      const next = orders.slice(index + 1).find((order) => order !== undefined);
      const order = previous === undefined ? (next ?? 1024) - 1024
        : next === undefined ? previous + 1024 : previous + (next - previous) / 2;
      if (!Number.isFinite(order) || order === previous || order === next) rebalance = true;
      orders[index] = order;
    }
    for (const [index, value] of desired.entries()) {
      const order = rebalance ? index * 1024 : orders[index]!;
      const existing = old.get(value.id);
      if (!existing || existing.order !== order || !equalValue(existing.value, value)) {
        changed.push({ collection, id: value.id, value, order });
      }
    }
    for (const record of original) if (!ids.has(record.id)) changed.push({ collection, id: record.id, order: record.order, deleted: true });
  }
  return changed;
}
