import type { Graph } from "./graph";
import type { SyncConflict } from "./graph-sync";
export type GraphSyncView = { graph: Graph | null; error: string | null; conflicts: SyncConflict[] };
export type GraphSyncListener = (state: GraphSyncView) => void;
