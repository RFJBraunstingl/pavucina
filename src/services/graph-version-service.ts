import { isDeepStrictEqual } from "node:util";

import type { GraphNode } from "../types/graph.ts";
import type { NodeRevisionDocument } from "../types/graph-storage.ts";

export function createNodeRevisionPlan(
  userId: string,
  nodes: GraphNode[],
  previousRevisions: Iterable<NodeRevisionDocument>,
) {
  const previousByNodeId = new Map(
    [...previousRevisions].map((revision) => [revision.node.id, revision]),
  );
  const inserted: NodeRevisionDocument[] = [];
  const nodeRevisionIds = nodes.map((node) => {
    const previous = previousByNodeId.get(node.id);
    if (previous && isDeepStrictEqual(previous.node, node)) return previous._id;
    const revision = { _id: crypto.randomUUID(), userId, node };
    inserted.push(revision);
    return revision._id;
  });
  return { inserted, nodeRevisionIds };
}
