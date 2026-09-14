import type { SyncConflict } from "./graph-sync";
export type SyncConflictDialogProps = { conflicts: SyncConflict[]; onResolve: (keepMine: boolean) => Promise<void> };
