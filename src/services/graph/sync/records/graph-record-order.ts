import { longestStableSubsequence } from "@/utils/shared/stable-subsequence.ts";
import type { GraphRecord } from "@/types/graph/graph-sync.ts";

const ORDER_GAP = 1_024;

function orderBetween(previous?: number, next?: number) {
  if (previous === undefined) return (next ?? ORDER_GAP) - ORDER_GAP;
  if (next === undefined) return previous + ORDER_GAP;
  return previous + (next - previous) / 2;
}

export function desiredRecordOrders(
  original: GraphRecord[],
  desiredIds: string[],
) {
  const originalById = new Map(original.map((record) => [record.id, record]));
  const stableIds = longestStableSubsequence(
    original.map(({ id }) => id),
    desiredIds,
  );
  const orders = desiredIds.map((id) =>
    stableIds.has(id) ? originalById.get(id)?.order : undefined,
  );
  const nextStableOrders = new Array<number | undefined>(orders.length);
  let nextStableOrder: number | undefined;
  for (let index = orders.length - 1; index >= 0; index--) {
    nextStableOrders[index] = nextStableOrder;
    if (orders[index] !== undefined) nextStableOrder = orders[index];
  }

  let needsRebalance = false;
  for (let index = 0; index < orders.length; index++) {
    if (orders[index] !== undefined) continue;
    const previous = orders[index - 1];
    const next = nextStableOrders[index];
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
