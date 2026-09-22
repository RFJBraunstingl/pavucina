import "server-only";

import { createHash } from "node:crypto";

import { isGraph } from "../core/graph-service";
import {
  applyGraphOperations,
  diffGraph,
  GraphConflictError,
} from "../sync/graph-patch-service";
import { recordsGraph } from "../sync/graph-record-service";
import {
  graphRevision,
  isDuplicateKeyError,
  MAX_GRAPH_WRITE_ATTEMPTS,
  writeGraphCommit,
} from "./graph-write-service";
import { graphCollections, latestCommit } from "./stores/graph-commit-store";
import {
  advanceCurrentGraph,
  currentGraphRecords,
} from "./stores/graph-current-store";
import { loadLegacyGraph } from "./stores/legacy-graph-repository";
import type { Graph } from "@/types/graph/graph";
import type {
  GraphPatch,
  GraphRevision,
  GraphSnapshot,
} from "@/types/graph/graph-sync";

export async function loadGraphSnapshot(
  userId: string,
): Promise<GraphSnapshot | null> {
  for (let attempt = 0; attempt < MAX_GRAPH_WRITE_ATTEMPTS; attempt++) {
    const head = await latestCommit(userId);
    if (!head) {
      const legacyGraph = await loadLegacyGraph(userId);
      if (!legacyGraph) return null;
      if (!isGraph(legacyGraph)) {
        throw new Error(
          "The saved graph is invalid. Restore a backup in Preferences.",
        );
      }
      await replaceGraph(userId, legacyGraph, true);
      continue;
    }

    const records = await currentGraphRecords(userId, head);
    const unchangedHead = (await latestCommit(userId))?._id === head._id;
    if (unchangedHead) {
      return {
        revision: graphRevision(head.generation, head.sequence),
        records,
      };
    }
  }
  throw new Error("The workspace is changing. Please retry loading it.");
}

export async function loadLatestGraph(userId: string): Promise<Graph | null> {
  const snapshot = await loadGraphSnapshot(userId);
  return snapshot ? recordsGraph(snapshot.records) : null;
}

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

export async function replaceGraph(
  userId: string,
  graph: Graph,
  onlyIfMissing = false,
) {
  const head = await latestCommit(userId);
  if (onlyIfMissing && head) return null;
  const base = head
    ? {
        revision: graphRevision(head.generation, head.sequence),
        records: [],
      }
    : null;
  try {
    return await writeGraphCommit(
      userId,
      graph,
      base,
      crypto.randomUUID(),
      "snapshot",
      true,
    );
  } catch (error) {
    if (isDuplicateKeyError(error) && onlyIfMissing) return null;
    throw error;
  }
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

export function restoreGraphVersion(userId: string, graph: Graph) {
  return replaceGraph(userId, graph);
}
