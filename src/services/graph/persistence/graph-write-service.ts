import "server-only";

import { changedGraphRecords, recordsGraph } from "../sync/records/graph-record-service";
import { pruneImportedHistory } from "./graph-pruning-service";
import { publishCommit } from "./stores/graph-commit-store";
import { advanceCurrentGraph } from "./stores/graph-current-store";
import type { Graph } from "@/types/graph/graph";
import type { GraphSnapshot } from "@/types/graph/graph-sync";

export const MAX_GRAPH_WRITE_ATTEMPTS = 5;

const EMPTY_GRAPH: Graph = {
  version: 1,
  nodes: [],
  relationships: [],
  inboxNodes: [],
};

export function graphRevision(generation: string, sequence: number) {
  return { generation, sequence };
}

export function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000,
  );
}

function importedEntityIds(graph: Graph, previous: Graph) {
  const importedIds = new Set(
    [...graph.nodes, ...previous.nodes].flatMap((node) =>
      node.type === "event" && node.properties.externalOrigin ? [node.id] : [],
    ),
  );
  for (const relationship of [
    ...previous.relationships,
    ...graph.relationships,
  ]) {
    if (importedIds.has(relationship.sourceId)) {
      importedIds.add(relationship.id);
    }
  }
  return importedIds;
}

async function updateGraphReadModels(
  userId: string,
  commit: Parameters<typeof publishCommit>[0],
  importedRecordIds: string[],
  replacement: boolean,
) {
  await Promise.all([
    advanceCurrentGraph(userId, commit).catch((error) =>
      console.error("Could not update current graph", error),
    ),
    pruneImportedHistory(
      userId,
      graphRevision(commit.generation, commit.sequence),
      importedRecordIds,
      replacement,
    ).catch((error) =>
      console.error("Could not prune imported history", error),
    ),
  ]);
}

export async function writeGraphCommit(
  userId: string,
  graph: Graph,
  base: GraphSnapshot | null,
  mutationId: string,
  digest: string,
  replacement = false,
) {
  const sequence = (base?.revision.sequence ?? 0) + 1;
  const generation = replacement
    ? crypto.randomUUID()
    : base?.revision.generation ?? crypto.randomUUID();
  const previousGraph = base ? recordsGraph(base.records) : EMPTY_GRAPH;
  const importedIds = importedEntityIds(graph, previousGraph);
  const changedRecords = changedGraphRecords(
    replacement ? [] : base?.records ?? [],
    graph,
  );
  const commit = {
    _id: crypto.randomUUID(),
    userId,
    generation,
    sequence,
    mutationId,
    digest,
    createdAt: new Date(),
  };

  await publishCommit(commit, changedRecords, importedIds);
  await updateGraphReadModels(
    userId,
    commit,
    changedRecords
      .filter((record) => importedIds.has(record.id))
      .map((record) => record.id),
    replacement,
  );
  return graphRevision(generation, sequence);
}
