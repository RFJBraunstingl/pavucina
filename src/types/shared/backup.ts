import type { Graph } from "@/types/graph/graph";
import type { UserPreferences } from "@/types/preferences/preferences";

export type BackupRestoreProps = {
  graph: Graph | null;
  preferences: UserPreferences;
  onRestore: (graph: Graph, preferences: UserPreferences) => Promise<boolean>;
};
