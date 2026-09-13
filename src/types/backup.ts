import type { Graph } from "./graph";
import type { UserPreferences } from "./preferences";

export type BackupRestoreProps = {
  graph: Graph | null;
  preferences: UserPreferences;
  onRestore: (graph: Graph, preferences: UserPreferences) => Promise<boolean>;
};
