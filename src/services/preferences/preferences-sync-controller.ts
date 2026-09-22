import { readBrowserValue, writeBrowserValue } from "@/services/graph/client/browser-database.ts";
import { GraphConflictError } from "@/services/graph/sync/graph-conflict-error.ts";
import { browserTabId } from "@/utils/shared/browser-session.ts";
import { DEFAULT_USER_PREFERENCES } from "./preferences-service.ts";
import {
  applyPreferencePatches,
  applyPreferencesPatch,
  diffPreferences,
  hasPreferenceChanges,
  withoutConflictingPreferenceFields,
} from "./patch/settings-patch-service.ts";
import {
  applyGuestPreferencePatch,
  loadGuestPreferences,
  saveGuestPreferences,
} from "./storage/local-preferences-store.ts";
import {
  pullPreferenceChanges,
  restoreRemotePreferences,
  sendPreferencePatch,
} from "./storage/remote-preferences-store.ts";
import type { UserPreferences } from "@/types/preferences/preferences.ts";
import type {
  PreferencesCache,
  PreferencesUpdate,
  PreferencesView,
} from "@/types/preferences/preferences-sync.ts";

export class PreferencesSyncController {
  preferences: UserPreferences | null = null;
  conflicts: PreferencesView["conflicts"] = [];
  active = true;

  private cache: PreferencesCache = {
    preferences: DEFAULT_USER_PREFERENCES,
    revision: -1,
    pending: [],
  };
  private syncPromise: Promise<void> | null = null;
  private cacheWrite = Promise.resolve();
  private readonly cacheKey: string;

  constructor(
    private readonly scope: string,
    private readonly onStateChange: (state: PreferencesView) => void,
  ) {
    this.cacheKey = `${scope}:${browserTabId()}:preferences`;
  }

  private publishState(error: string | null = null) {
    if (!this.active) return;
    this.onStateChange({
      preferences: this.preferences,
      error,
      conflicts: this.conflicts,
    });
  }

  private saveCache() {
    const cache = structuredClone(this.cache);
    this.cacheWrite = this.cacheWrite
      .catch(() => undefined)
      .then(() => writeBrowserValue(this.cacheKey, cache));
    return this.cacheWrite;
  }

  private applyPendingPreferences(keepMine = false) {
    return applyPreferencePatches(
      this.cache.preferences,
      this.cache.pending,
      keepMine,
    );
  }

  async open() {
    try {
      const saved = await readBrowserValue<PreferencesCache>(this.cacheKey);
      if (saved) this.cache = saved;
      this.preferences = this.applyPendingPreferences();
      await this.flush();
    } catch (error) {
      this.publishError(error);
    }
  }

  change(next: PreferencesUpdate) {
    const preferences = typeof next === "function"
      ? next(this.preferences)
      : next;
    if (!preferences || !this.preferences) return;
    const patch = diffPreferences(this.preferences, preferences);
    if (!hasPreferenceChanges(patch)) return;
    this.cache.pending.push(patch);
    this.preferences = preferences;
    this.publishState();
    void this.saveCache()
      .then(() => this.flush())
      .catch((error) => this.publishError(error));
  }

  private publishError(error: unknown) {
    if (error instanceof GraphConflictError) this.conflicts = error.conflicts;
    const message = error instanceof Error ? error.message : "Could not synchronize preferences";
    this.publishState(message);
  }

  flush(): Promise<void> {
    if (this.syncPromise) return this.syncPromise;
    this.syncPromise = this.synchronize()
      .finally(() => {
        this.syncPromise = null;
      })
      .then(() => {
        if (this.active && !this.conflicts.length && this.cache.pending.length) {
          return this.flush();
        }
      });
    return this.syncPromise;
  }

  private async pullSavedPreferences() {
    if (this.scope === "guest") {
      this.cache.preferences = await loadGuestPreferences();
      return;
    }
    const changes = await pullPreferenceChanges(this.cache.revision);
    this.cache.preferences = applyPreferencesPatch(
      this.cache.preferences,
      { fields: changes.fields },
      true,
    );
    this.cache.revision = changes.revision;
  }

  private async synchronize() {
    try {
      await this.cacheWrite;
      if (!this.active || this.conflicts.length) return;
      while (this.cache.pending.length && this.active) {
        const patch = this.cache.pending[0];
        if (this.scope === "guest") {
          await applyGuestPreferencePatch(patch);
        } else {
          await sendPreferencePatch(patch);
        }
        if (!this.active) return;
        this.cache.pending.shift();
        await this.pullSavedPreferences();
        if (!this.active) return;
        await this.saveCache();
      }
      if (!this.active) return;
      await this.pullSavedPreferences();
      if (!this.active) return;
      this.preferences = this.applyPendingPreferences();
      await this.saveCache();
      this.publishState();
    } catch (error) {
      this.publishError(error);
      throw error;
    }
  }

  async resolve(keepMine: boolean) {
    await this.pullSavedPreferences();
    if (!keepMine) {
      this.cache.pending = withoutConflictingPreferenceFields(
        this.cache.pending,
        this.conflicts,
      );
    }
    const preferences = this.applyPendingPreferences(keepMine);
    const resolution = diffPreferences(this.cache.preferences, preferences);
    this.cache.pending = hasPreferenceChanges(resolution) ? [resolution] : [];
    this.conflicts = [];
    this.preferences = preferences;
    await this.saveCache();
    this.publishState();
    await this.flush();
  }

  async restore(preferences: UserPreferences) {
    await this.syncPromise?.catch(() => undefined);
    this.ensureActiveRestore();
    if (this.scope === "guest") await saveGuestPreferences(preferences);
    else await restoreRemotePreferences(preferences);
    this.ensureActiveRestore();
    this.cache.pending = [];
    this.conflicts = [];
    await this.pullSavedPreferences();
    this.preferences = this.cache.preferences;
    await this.saveCache();
    this.publishState();
  }

  private ensureActiveRestore() {
    if (!this.active) throw new Error("Your account changed during restore");
  }
}
