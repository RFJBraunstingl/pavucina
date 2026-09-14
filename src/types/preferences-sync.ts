import type { UserPreferences } from "./preferences";
import type { SettingsPatch } from "./settings-sync";
import type { SyncConflict } from "./graph-sync";
export type PreferencesCache = { preferences: UserPreferences; revision: number; pending: SettingsPatch[] };
export type PreferencesView = { preferences: UserPreferences | null; error: string | null; conflicts: SyncConflict[] };
