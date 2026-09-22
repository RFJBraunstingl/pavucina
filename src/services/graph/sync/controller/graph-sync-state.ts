import { readBrowserGraph } from "../../client/browser-database.ts";
import { loadGuestGraph } from "../../client/local-graph-store.ts";
import {
  loadRemoteGraph,
  saveRemoteGraph,
} from "../../client/remote-graph-store.ts";
import {
  applyGraphOperations,
  diffGraph,
  GraphConflictError,
} from "../graph-patch-service.ts";
import { recordsGraph } from "../graph-record-service.ts";
import { withoutConflictingOperations } from "@/utils/shared/sync-conflicts.ts";
import type {
  GraphPatch,
  GraphSnapshot,
  SyncConflict,
} from "@/types/graph/graph-sync.ts";

export function graphWithPendingPatches(
  snapshot: GraphSnapshot,
  patches: GraphPatch[],
  force = false,
) {
  let graph = recordsGraph(snapshot.records);
  for (const patch of patches) {
    if (!patch.operations.length) continue;
    const workspaceWasReplaced =
      patch.baseRevision.generation !== snapshot.revision.generation;
    if (!force && workspaceWasReplaced) {
      throw new GraphConflictError([{
        id: "graph",
        field: "workspace replaced",
        mine: patch.operations,
      }]);
    }
    graph = applyGraphOperations(graph, patch.operations, force);
  }
  return graph;
}

export async function loadGuestSyncState(cacheScope: string, today: string) {
  await loadGuestGraph(today);
  return {
    snapshot: (await readBrowserGraph("guest"))!.snapshot,
    patches: (await readBrowserGraph(cacheScope))?.patches ?? [],
  };
}

export async function loadAccountSyncState(
  cacheScope: string,
  today: string,
  isActive: () => boolean,
) {
  const cached = await readBrowserGraph(cacheScope);
  if (cached) return cached;
  let snapshot = await loadRemoteGraph();
  if (!snapshot && isActive()) {
    await saveRemoteGraph(await loadGuestGraph(today), true);
    snapshot = await loadRemoteGraph();
  }
  return snapshot ? { snapshot, patches: [] } : null;
}

export function resolvePendingPatches(
  snapshot: GraphSnapshot,
  patches: GraphPatch[],
  conflicts: SyncConflict[],
  keepMine: boolean,
) {
  const retainedPatches = keepMine
    ? patches
    : patches.map((patch) => ({
        ...patch,
        operations: withoutConflictingOperations(patch.operations, conflicts),
      }));
  const graph = graphWithPendingPatches(snapshot, retainedPatches, keepMine);
  const operations = diffGraph(recordsGraph(snapshot.records), graph);
  return {
    graph,
    patches: operations.length
      ? [{ mutationId: crypto.randomUUID(), baseRevision: snapshot.revision, operations }]
      : [],
  };
}
