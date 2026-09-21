import type { SyncConflict } from "@/types/graph/graph-sync";
export type SyncConflictDialogProps = { conflicts: SyncConflict[]; onResolve: (keepMine: boolean) => Promise<void> };
