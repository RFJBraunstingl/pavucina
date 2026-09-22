import "server-only";

import { createHash } from "node:crypto";

import { isGraph } from "../core/graph-service";
import { GraphConflictError } from "../sync/graph-conflict-error";
import { applyGraphOperations } from "../sync/graph-patch-service";
import { diffGraph } from "../sync/graph-diff-service";
import { recordsGraph } from "../sync/records/graph-record-service";
import {
  graphRevision,
  isDuplicateKeyError,
  MAX_GRAPH_WRITE_ATTEMPTS,
  writeGraphCommit,
} from "./graph-write-service";
import { graphCollections } from "./stores/graph-commit-store";
import { advanceCurrentGraph } from "./stores/graph-current-store";
import { loadGraphSnapshot } from "./graph-snapshot-service";
import type { Graph } from "@/types/graph/graph";
import type {
  GraphPatch,
  GraphRevision,
} from "@/types/graph/graph-sync";

export async function patchGraph(userId: string, patch: GraphPatch) {
  const digest = createHash("sha256")
    .update(JSON.stringify(patch))
    .digest("hex");
  const { commits } = await graphCollections();

  for (let attempt = 0; attempt < MAX_GRAPH_WRITE_ATTEMPTS; attempt++) {
    const previous = await commits.findOne({
      userId,
      mutationId: patch.mutationId,
    });
    if (previous) {
      if (previous.digest !== digest) {
        throw new Error("Mutation ID was reused with different changes.");
      }
      await advanceCurrentGraph(userId, previous).catch((error) =>
        console.error("Could not update current graph", error),
      );
      return graphRevision(previous.generation, previous.sequence);
    }

    const base = await loadGraphSnapshot(userId);
    if (!base || base.revision.generation !== patch.baseRevision.generation) {
      throw new GraphConflictError([{
        id: "graph",
        field: "workspace replaced",
        mine: patch.operations,
      }]);
    }
    const next = applyGraphOperations(
      recordsGraph(base.records),
      patch.operations,
    );
    try {
      return await writeGraphCommit(
        userId,
        next,
        base,
        patch.mutationId,
        digest,
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  throw new Error("The workspace is busy. Please retry saving.");
}

export async function updateGraphVersion(
  userId: string,
  update: (graph: Graph) => Graph,
): Promise<GraphRevision> {
  for (let attempt = 0; attempt < MAX_GRAPH_WRITE_ATTEMPTS; attempt++) {
    const base = await loadGraphSnapshot(userId);
    if (!base) throw new Error("Workspace not found");
    const graph = recordsGraph(base.records);
    const next = update(graph);
    if (!isGraph(next)) throw new Error("Invalid graph");
    if (!diffGraph(graph, next).length) return base.revision;
    try {
      return await writeGraphCommit(
        userId,
        next,
        base,
        crypto.randomUUID(),
        "calendar import",
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  throw new Error("The workspace is busy. Please retry importing.");
}
