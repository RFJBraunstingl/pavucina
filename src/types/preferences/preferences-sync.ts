import type { UserPreferences } from "./preferences";
import type { SettingsPatch } from "./settings-sync";
import type { SyncConflict } from "@/types/graph/graph-sync";

export type PreferencesCache = {
  preferences: UserPreferences;
  revision: number;
  pending: SettingsPatch[];
};

export type PreferencesView = {
  preferences: UserPreferences | null;
  error: string | null;
  conflicts: SyncConflict[];
};

export type PreferenceChanges = {
  revision: number;
  fields: Record<string, { after?: unknown }>;
};

export type PreferencesUpdate =
  | UserPreferences
  | null
  | ((current: UserPreferences | null) => UserPreferences | null);
