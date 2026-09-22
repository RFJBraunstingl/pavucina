import { writeBrowserGraph } from "../../client/browser-database.ts";
import { saveGuestGraph } from "../../client/local-graph-store.ts";
import {
  loadRemoteGraph,
  pullGraphChanges,
  restoreRemoteGraph,
  sendGraphPatch,
} from "../../client/remote-graph-store.ts";
import { commitGuestPatches } from "../guest-graph-commit.ts";
import { GraphConflictError } from "../graph-conflict-error.ts";
import {
  createGraphPatch,
  graphWithPendingPatches,
  loadAccountSyncState,
  loadGuestSnapshot,
  loadGuestSyncState,
  resolvePendingPatches,
} from "./graph-sync-state.ts";
import { browserTabId } from "@/utils/shared/browser-session.ts";
import type { Graph } from "@/types/graph/graph.ts";
import type {
  GraphPatch,
  GraphSnapshot,
  SyncConflict,
} from "@/types/graph/graph-sync.ts";
import type {
  GraphSyncListener,
  GraphUpdate,
} from "@/types/graph/graph-sync-controller.ts";

export class GraphSyncController {
  graph: Graph | null = null;
  snapshot: GraphSnapshot | null = null;
  active = true;

  private patches: GraphPatch[] = [];
  private conflicts: SyncConflict[] = [];
  private syncPromise: Promise<void> | null = null;
  private cacheWrite: Promise<void> = Promise.resolve();
  private readonly cacheKey: string;

  constructor(
    readonly scope: string,
    private readonly onStateChange: GraphSyncListener,
  ) {
    this.cacheKey = `${scope}:${browserTabId()}`;
  }

  get hasPending() {
    return this.patches.length > 0;
  }

  private publishState(error: string | null = null) {
    if (!this.active) return;
    this.onStateChange({ graph: this.graph, error, conflicts: this.conflicts });
  }

  private saveCache() {
    if (!this.snapshot) return Promise.resolve();
    const snapshot = this.snapshot;
    const patches = [...this.patches];
    this.cacheWrite = this.cacheWrite
      .catch(() => undefined)
      .then(() => writeBrowserGraph(this.cacheKey, snapshot, patches));
    return this.cacheWrite;
  }

  async open(today: string) {
    try {
      const state = this.scope === "guest"
        ? await loadGuestSyncState(this.cacheKey, today)
        : await loadAccountSyncState(
            this.cacheKey,
            today,
            () => this.active,
          );
      if (!state || !this.active) return;
      this.snapshot = state.snapshot;
      this.patches = state.patches;
      this.graph = graphWithPendingPatches(this.snapshot, this.patches);
      this.publishState();
      await this.flush();
    } catch (error) {
      this.publishError(error);
    }
  }

  change(next: GraphUpdate) {
    const graph = typeof next === "function" ? next(this.graph) : next;
    if (!graph || !this.snapshot || !this.graph) return;
    const patch = createGraphPatch(this.graph, graph, this.snapshot.revision);
    if (patch) this.patches.push(patch);
    this.graph = graph;
    this.publishState();
    void this.saveCache().catch((error) => this.publishError(error));
  }

  private publishError(error: unknown) {
    if (error instanceof GraphConflictError) this.conflicts = error.conflicts;
    this.publishState(
      error instanceof Error ? error.message : "Could not synchronize workspace",
    );
  }

  flush(): Promise<void> {
    if (this.syncPromise) return this.syncPromise;
    this.syncPromise = this.synchronize()
      .finally(() => {
        this.syncPromise = null;
      })
      .then(() => {
        if (this.active && !this.conflicts.length && this.patches.length) {
          return this.flush();
        }
      });
    return this.syncPromise;
  }

  private async synchronize() {
    try {
      await this.cacheWrite;
      if (!this.active || !this.snapshot) return;
      if (this.conflicts.length) throw new GraphConflictError(this.conflicts);
      if (this.scope === "guest") await this.synchronizeGuest();
      else await this.synchronizeAccount(this.snapshot);
      if (!this.active) return;
      await this.saveCache();
      this.publishState();
    } catch (error) {
      this.publishError(error);
      throw error;
    }
  }

  private async synchronizeGuest() {
    const patches = [...this.patches];
    this.snapshot = await commitGuestPatches(patches);
    this.patches.splice(0, patches.length);
    this.graph = graphWithPendingPatches(this.snapshot, this.patches);
  }

  private async synchronizeAccount(snapshot: GraphSnapshot) {
    while (this.patches.length && this.active) {
      await sendGraphPatch(this.patches[0]);
      if (!this.active) return;
      snapshot = await pullGraphChanges(snapshot);
      this.snapshot = snapshot;
      if (!this.active) return;
      this.patches.shift();
      await this.saveCache();
    }
    if (!this.active) return;
    snapshot = await pullGraphChanges(snapshot);
    this.snapshot = snapshot;
    if (this.active) {
      this.graph = graphWithPendingPatches(snapshot, this.patches);
    }
  }

  async resolve(keepMine: boolean) {
    if (!this.snapshot) return;
    this.snapshot = this.scope === "guest"
      ? await loadGuestSnapshot()
      : await pullGraphChanges(this.snapshot);
    const resolved = resolvePendingPatches(
      this.snapshot,
      this.patches,
      this.conflicts,
      keepMine,
    );
    this.patches = resolved.patches;
    this.conflicts = [];
    this.graph = resolved.graph;
    await this.saveCache();
    this.publishState();
    await this.flush();
  }

  async restore(graph: Graph) {
    await this.syncPromise?.catch(() => undefined);
    this.ensureActiveRestore();
    if (this.scope === "guest") await saveGuestGraph(graph, true);
    else await restoreRemoteGraph(graph);
    this.ensureActiveRestore();
    this.snapshot = this.scope === "guest"
      ? await loadGuestSnapshot()
      : await loadRemoteGraph();
    this.ensureActiveRestore();
    this.patches = [];
    this.conflicts = [];
    this.graph = graph;
    await this.saveCache();
    this.publishState();
  }

  private ensureActiveRestore() {
    if (!this.active) throw new Error("Your account changed during restore");
  }
}
