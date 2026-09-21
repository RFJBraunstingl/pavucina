import "server-only";
import { createHash } from "node:crypto";
import { advanceCurrentGraph, currentGraphRecords } from "./graph-current-store";
import { pruneImportedHistory } from "./graph-pruning-service";
import { loadLegacyGraph } from "./legacy-graph-repository";
import { graphCollections, latestCommit, publishCommit } from "./graph-commit-store";
import { changedGraphRecords, recordsGraph } from "../sync/graph-record-service";
import { applyGraphOperations, diffGraph, GraphConflictError } from "../sync/graph-patch-service";
import { isGraph } from "../core/graph-service";
import type { Graph } from "@/types/graph/graph";
import type { GraphPatch, GraphSnapshot } from "@/types/graph/graph-sync";

const empty: Graph = { version: 1, nodes: [], relationships: [], inboxNodes: [] };
const revision = (generation: string, sequence: number) => ({ generation, sequence });
const duplicate = (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);

export async function loadGraphSnapshot(userId: string): Promise<GraphSnapshot | null> {
  for (let retry = 0; retry < 5; retry++) {
    const head = await latestCommit(userId);
    if (!head) {
      const legacy = await loadLegacyGraph(userId);
      if (!legacy) return null;
      if (!isGraph(legacy)) throw new Error("The saved graph is invalid. Restore a backup in Preferences.");
      await replaceGraph(userId, legacy, true);
      continue;
    }
    const records = await currentGraphRecords(userId, head);
    if ((await latestCommit(userId))?._id === head._id) return { revision: revision(head.generation, head.sequence), records };
  }
  throw new Error("The workspace is changing. Please retry loading it.");
}
export async function loadLatestGraph(userId: string): Promise<Graph | null> {
  const snapshot = await loadGraphSnapshot(userId);
  return snapshot ? recordsGraph(snapshot.records) : null;
}

async function write(userId: string, graph: Graph, base: GraphSnapshot | null, mutationId: string, digest: string, replacement = false) {
  const sequence = (base?.revision.sequence ?? 0) + 1;
  const generation = replacement ? crypto.randomUUID() : base?.revision.generation ?? crypto.randomUUID();
  const oldGraph = base ? recordsGraph(base.records) : empty;
  const importedIds = new Set([...graph.nodes, ...oldGraph.nodes].flatMap((node) =>
    node.type === "event" && node.properties.externalOrigin ? [node.id] : []));
  for (const edge of [...oldGraph.relationships, ...graph.relationships]) {
    if (importedIds.has(edge.sourceId)) importedIds.add(edge.id);
  }
  const changed = changedGraphRecords(replacement ? [] : base?.records ?? [], graph);
  const commit = { _id: crypto.randomUUID(), userId, generation, sequence, mutationId, digest, createdAt: new Date() };
  await publishCommit(commit, changed, importedIds);
  // Publication succeeded; cleanup failure must not turn a committed mutation into a failed save.
  await advanceCurrentGraph(userId, commit).catch((error) => console.error("Could not update current graph", error));
  await pruneImportedHistory(userId, revision(generation, sequence), changed.filter((record) => importedIds.has(record.id)).map((record) => record.id), replacement).catch((error) => console.error("Could not prune imported history", error));
  return revision(generation, sequence);
}

export async function patchGraph(userId: string, patch: GraphPatch) {
  const digest = createHash("sha256").update(JSON.stringify(patch)).digest("hex");
  const { commits } = await graphCollections();
  for (let retry = 0; retry < 5; retry++) {
    const previous = await commits.findOne({ userId, mutationId: patch.mutationId });
    if (previous) {
      if (previous.digest !== digest) throw new Error("Mutation ID was reused with different changes.");
      await advanceCurrentGraph(userId, previous).catch((error) => console.error("Could not update current graph", error));
      return revision(previous.generation, previous.sequence);
    }
    const base = await loadGraphSnapshot(userId);
    if (!base || base.revision.generation !== patch.baseRevision.generation) {
      throw new GraphConflictError([{ id: "graph", field: "workspace replaced", mine: patch.operations }]);
    }
    const next = applyGraphOperations(recordsGraph(base.records), patch.operations);
    try { return await write(userId, next, base, patch.mutationId, digest); }
    catch (error) { if (!duplicate(error)) throw error; }
  }
  throw new Error("The workspace is busy. Please retry saving.");
}

export async function replaceGraph(userId: string, graph: Graph, onlyIfMissing = false) {
  const head = await latestCommit(userId);
  if (onlyIfMissing && head) return null;
  const base = head ? { revision: revision(head.generation, head.sequence), records: [] } : null;
  try { return await write(userId, graph, base, crypto.randomUUID(), "snapshot", true); }
  catch (error) {
    if (duplicate(error) && onlyIfMissing) return null;
    throw error;
  }
}
export async function updateGraphVersion(userId: string, update: (graph: Graph) => Graph) {
  for (let retry = 0; retry < 5; retry++) {
    const base = await loadGraphSnapshot(userId);
    if (!base) throw new Error("Workspace not found");
    const graph = recordsGraph(base.records);
    const next = update(graph);
    if (!isGraph(next)) throw new Error("Invalid graph");
    if (!diffGraph(graph, next).length) return base.revision;
    try { return await write(userId, next, base, crypto.randomUUID(), "calendar import"); }
    catch (error) { if (!duplicate(error)) throw error; }
  }
  throw new Error("The workspace is busy. Please retry importing.");
}
export const restoreGraphVersion = (userId: string, graph: Graph) => replaceGraph(userId, graph);
