import type { SyncConflict } from "@/types/graph/graph-sync.ts";

export class GraphConflictError extends Error {
  readonly conflicts: SyncConflict[];

  constructor(conflicts: SyncConflict[]) {
    super("Some changes conflict with saved data.");
    this.conflicts = conflicts;
  }
}
