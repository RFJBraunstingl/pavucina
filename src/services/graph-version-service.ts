import { isDeepStrictEqual } from "node:util";

import type { Graph } from "../types/graph.ts";
import type { NodeRevisionDocument } from "../types/graph-storage.ts";

export function createNodeRevisionPlan(
  graph: Graph,
  previousRevisions: Iterable<NodeRevisionDocument>,
) {
  const previousByNodeId = new Map(
    [...previousRevisions].map((revision) => [revision.node.id, revision]),
  );
  const inserted: NodeRevisionDocument[] = [];
  const nodeRevisionIds = graph.nodes.map((node) => {
    const previous = previousByNodeId.get(node.id);
    if (previous && isDeepStrictEqual(previous.node, node)) return previous._id;
    const revision = { _id: crypto.randomUUID(), node };
    inserted.push(revision);
    return revision._id;
  });
  return { inserted, nodeRevisionIds };
}
