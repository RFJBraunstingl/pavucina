import { commitGuestPatches } from "./guest-graph-commit.ts";
import { withoutConflictingOperations } from "../utils/sync-conflicts.ts";
import { loadGuestGraph, saveGuestGraph } from "./local-graph-store.ts";
import { readBrowserGraph, writeBrowserGraph } from "./browser-database.ts";
import { loadRemoteGraph, pullGraphChanges, saveRemoteGraph, sendGraphPatch, restoreRemoteGraph } from "./remote-graph-store.ts";
import { applyGraphOperations, diffGraph, GraphConflictError } from "./graph-patch-service.ts";
import { recordsGraph } from "./graph-record-service.ts";
import type { Graph } from "../types/graph.ts";
import type { GraphPatch, GraphSnapshot, SyncConflict } from "../types/graph-sync.ts";
import type { GraphSyncListener } from "../types/graph-sync-controller.ts";

export class GraphSyncController {
  graph: Graph | null = null;
  snapshot: GraphSnapshot | null = null;
  private patches: GraphPatch[] = [];
  private running: Promise<void> | null = null;
  private disk: Promise<void> = Promise.resolve();
  private conflicts: SyncConflict[] = [];
  active = true;
  get hasPending() { return this.patches.length > 0; }
  private cacheScope: string;
  readonly scope: string;
  private listener: GraphSyncListener;
  constructor(scope: string, listener: GraphSyncListener) {
    this.scope = scope; this.listener = listener;
    const tab = sessionStorage.getItem("pavucina.tab") ?? crypto.randomUUID();
    sessionStorage.setItem("pavucina.tab", tab);
    this.cacheScope = `${scope}:${tab}`;
  }
  private emit(error: string | null = null) {
    if (this.active) this.listener({ graph: this.graph, error, conflicts: this.conflicts });
  }
  private persist() {
    if (!this.snapshot) return Promise.resolve();
    const snapshot = this.snapshot, patches = [...this.patches];
    this.disk = this.disk.catch(() => undefined).then(() => writeBrowserGraph(this.cacheScope, snapshot, patches));
    return this.disk;
  }
  async open(today: string) {
    try {
      if (this.scope === "guest") {
        this.graph = await loadGuestGraph(today);
        this.snapshot = (await readBrowserGraph("guest"))!.snapshot;
        this.patches = (await readBrowserGraph(this.cacheScope))?.patches ?? [];
        this.graph = this.overlay();
      } else {
        const cached = await readBrowserGraph(this.cacheScope);
        if (cached) { this.snapshot = cached.snapshot; this.patches = cached.patches; }
        else {
          this.snapshot = await loadRemoteGraph();
          if (!this.snapshot && this.active) {
            await saveRemoteGraph(await loadGuestGraph(today), true);
            this.snapshot = await loadRemoteGraph();
          }
        }
        if (!this.active || !this.snapshot) return;
        this.graph = this.overlay();
      }
      this.emit();
      await this.flush();
    } catch (error) { this.fail(error); }
  }
  private overlay(force = false) {
    let graph = recordsGraph(this.snapshot!.records);
    for (const patch of this.patches) {
      if (!patch.operations.length) continue;
      if (!force && patch.baseRevision.generation !== this.snapshot!.revision.generation) throw new GraphConflictError([{ id: "graph", field: "workspace replaced", mine: patch.operations }]);
      graph = applyGraphOperations(graph, patch.operations, force);
    }
    return graph;
  }
  change(next: Graph | null | ((current: Graph | null) => Graph | null)) {
    const graph = typeof next === "function" ? next(this.graph) : next;
    if (!graph || !this.snapshot || !this.graph) return;
    const before = this.graph;
    const operations = diffGraph(before, graph);
    if (operations.length) this.patches.push({ mutationId: crypto.randomUUID(), baseRevision: this.snapshot.revision, operations });
    this.graph = graph;
    this.emit();
    void this.persist().catch((error) => this.fail(error));
  }
  private fail(error: unknown) {
    if (error instanceof GraphConflictError) this.conflicts = error.conflicts;
    this.emit(error instanceof Error ? error.message : "Could not synchronize workspace");
  }
  flush(): Promise<void> {
    if (this.running) return this.running;
    const pending = this.synchronize();
    this.running = pending.then(() => {
      this.running = null;
      if (this.active && !this.conflicts.length && this.patches.length) return this.flush();
    }, (error) => { this.running = null; throw error; });
    return this.running;
  }
  private async synchronize() {
    try {
      await this.disk;
      if (!this.active || !this.snapshot) return;
      if (this.conflicts.length) throw new GraphConflictError(this.conflicts);
      if (this.scope === "guest") {
        const patches = [...this.patches];
        this.snapshot = await commitGuestPatches(patches);
        this.patches.splice(0, patches.length);
        this.graph = this.overlay();
      } else {
        while (this.patches.length && this.active) {
          const patch = this.patches[0];
          await sendGraphPatch(patch);
          if (!this.active) return;
          this.snapshot = await pullGraphChanges(this.snapshot);
          if (!this.active) return;
          this.patches.shift();
          await this.persist();
        }
        if (!this.active) return;
        this.snapshot = await pullGraphChanges(this.snapshot);
        if (!this.active) return;
        this.graph = this.overlay();
      }
      if (!this.active) return;
      await this.persist(); this.emit();
    } catch (error) { this.fail(error); throw error; }
  }
  async resolve(keepMine: boolean) {
    if (!this.snapshot) return;
    this.snapshot = this.scope === "guest" ? (await readBrowserGraph("guest"))!.snapshot : await pullGraphChanges(this.snapshot);
    if (!keepMine) this.patches = this.patches.map((patch) => ({ ...patch,
      operations: withoutConflictingOperations(patch.operations, this.conflicts) }));
    const graph = this.overlay(keepMine);
    const operations = diffGraph(recordsGraph(this.snapshot.records), graph);
    this.patches = operations.length ? [{ mutationId: crypto.randomUUID(), baseRevision: this.snapshot.revision, operations }] : [];
    this.conflicts = []; this.graph = graph;
    await this.persist(); this.emit(); await this.flush();
  }
  async restore(graph: Graph) {
    await this.running?.catch(() => undefined);
    if (!this.active) throw new Error("Your account changed during restore");
    if (this.scope === "guest") await saveGuestGraph(graph, true);
    else await restoreRemoteGraph(graph);
    if (!this.active) throw new Error("Your account changed during restore");
    this.snapshot = this.scope === "guest" ? (await readBrowserGraph("guest"))!.snapshot : await loadRemoteGraph();
    if (!this.active) throw new Error("Your account changed during restore");
    this.patches = []; this.conflicts = []; this.graph = graph;
    await this.persist(); this.emit();
  }
}
