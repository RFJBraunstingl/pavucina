import { readBrowserGraph, writeBrowserGraph } from "../../client/browser-database.ts";
import { saveGuestGraph } from "../../client/local-graph-store.ts";
import {
  loadRemoteGraph,
  pullGraphChanges,
  restoreRemoteGraph,
  sendGraphPatch,
} from "../../client/remote-graph-store.ts";
import { commitGuestPatches } from "../guest-graph-commit.ts";
import {
  diffGraph,
  GraphConflictError,
} from "../graph-patch-service.ts";
import {
  graphWithPendingPatches,
  loadAccountSyncState,
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
import type { GraphSyncListener } from "@/types/graph/graph-sync-controller.ts";

export class GraphSyncController {
  graph: Graph | null = null;
  snapshot: GraphSnapshot | null = null;
  active = true;

  private patches: GraphPatch[] = [];
  private conflicts: SyncConflict[] = [];
  private running: Promise<void> | null = null;
  private disk: Promise<void> = Promise.resolve();
  private readonly cacheScope: string;

  constructor(
    readonly scope: string,
    private readonly listener: GraphSyncListener,
  ) {
    this.cacheScope = `${scope}:${browserTabId()}`;
  }

  get hasPending() {
    return this.patches.length > 0;
  }

  private notify(error: string | null = null) {
    if (this.active) {
      this.listener({ graph: this.graph, error, conflicts: this.conflicts });
    }
  }

  private saveCache() {
    if (!this.snapshot) return Promise.resolve();
    const snapshot = this.snapshot;
    const patches = [...this.patches];
    this.disk = this.disk
      .catch(() => undefined)
      .then(() => writeBrowserGraph(this.cacheScope, snapshot, patches));
    return this.disk;
  }

  async open(today: string) {
    try {
      const state = this.scope === "guest"
        ? await loadGuestSyncState(this.cacheScope, today)
        : await loadAccountSyncState(
            this.cacheScope,
            today,
            () => this.active,
          );
      if (!state || !this.active) return;
      this.snapshot = state.snapshot;
      this.patches = state.patches;
      this.graph = graphWithPendingPatches(this.snapshot, this.patches);
      this.notify();
      await this.flush();
    } catch (error) {
      this.fail(error);
    }
  }

  change(next: Graph | null | ((current: Graph | null) => Graph | null)) {
    const graph = typeof next === "function" ? next(this.graph) : next;
    if (!graph || !this.snapshot || !this.graph) return;
    const operations = diffGraph(this.graph, graph);
    if (operations.length) {
      this.patches.push({
        mutationId: crypto.randomUUID(),
        baseRevision: this.snapshot.revision,
        operations,
      });
    }
    this.graph = graph;
    this.notify();
    void this.saveCache().catch((error) => this.fail(error));
  }

  private fail(error: unknown) {
    if (error instanceof GraphConflictError) this.conflicts = error.conflicts;
    this.notify(
      error instanceof Error ? error.message : "Could not synchronize workspace",
    );
  }

  flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.synchronize().then(
      () => {
        this.running = null;
        if (this.active && !this.conflicts.length && this.patches.length) {
          return this.flush();
        }
      },
      (error) => {
        this.running = null;
        throw error;
      },
    );
    return this.running;
  }

  private async synchronize() {
    try {
      await this.disk;
      if (!this.active || !this.snapshot) return;
      if (this.conflicts.length) throw new GraphConflictError(this.conflicts);
      if (this.scope === "guest") await this.synchronizeGuest();
      else await this.synchronizeAccount();
      if (!this.active) return;
      await this.saveCache();
      this.notify();
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  private async synchronizeGuest() {
    const patches = [...this.patches];
    this.snapshot = await commitGuestPatches(patches);
    this.patches.splice(0, patches.length);
    this.graph = graphWithPendingPatches(this.snapshot, this.patches);
  }

  private async synchronizeAccount() {
    while (this.patches.length && this.active) {
      await sendGraphPatch(this.patches[0]);
      if (!this.active) return;
      this.snapshot = await pullGraphChanges(this.snapshot!);
      if (!this.active) return;
      this.patches.shift();
      await this.saveCache();
    }
    if (!this.active) return;
    this.snapshot = await pullGraphChanges(this.snapshot!);
    if (this.active) {
      this.graph = graphWithPendingPatches(this.snapshot, this.patches);
    }
  }

  async resolve(keepMine: boolean) {
    if (!this.snapshot) return;
    this.snapshot = this.scope === "guest"
      ? (await readBrowserGraph("guest"))!.snapshot
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
    this.notify();
    await this.flush();
  }

  async restore(graph: Graph) {
    await this.running?.catch(() => undefined);
    this.ensureActiveRestore();
    if (this.scope === "guest") await saveGuestGraph(graph, true);
    else await restoreRemoteGraph(graph);
    this.ensureActiveRestore();
    this.snapshot = this.scope === "guest"
      ? (await readBrowserGraph("guest"))!.snapshot
      : await loadRemoteGraph();
    this.ensureActiveRestore();
    this.patches = [];
    this.conflicts = [];
    this.graph = graph;
    await this.saveCache();
    this.notify();
  }

  private ensureActiveRestore() {
    if (!this.active) throw new Error("Your account changed during restore");
  }
}
