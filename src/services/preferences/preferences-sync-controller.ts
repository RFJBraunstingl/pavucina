import { readBrowserValue, writeBrowserValue } from "@/services/graph/client/browser-database.ts";
import { GraphConflictError } from "@/services/graph/sync/graph-patch-service.ts";
import { browserTabId } from "@/utils/shared/browser-session.ts";
import { DEFAULT_USER_PREFERENCES } from "./preferences-service.ts";
import {
  applyPreferencesPatch,
  diffPreferences,
  hasPreferenceChanges,
  withoutConflictingPreferenceFields,
} from "./settings-patch-service.ts";
import {
  loadGuestPreferences,
  saveGuestPreferences,
} from "./storage/local-preferences-store.ts";
import {
  pullPreferenceChanges,
  saveRemotePreferences,
  sendPreferencePatch,
} from "./storage/remote-preferences-store.ts";
import type { UserPreferences } from "@/types/preferences/preferences.ts";
import type {
  PreferencesCache,
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
  private running: Promise<void> | null = null;
  private disk = Promise.resolve();
  private readonly cacheKey: string;

  constructor(
    private readonly scope: string,
    private readonly listener: (state: PreferencesView) => void,
  ) {
    this.cacheKey = `${scope}:${browserTabId()}:preferences`;
  }

  private notify(error: string | null = null) {
    if (this.active) {
      this.listener({
        preferences: this.preferences,
        error,
        conflicts: this.conflicts,
      });
    }
  }

  private saveCache() {
    const cache = structuredClone(this.cache);
    this.disk = this.disk
      .catch(() => undefined)
      .then(() => writeBrowserValue(this.cacheKey, cache));
    return this.disk;
  }

  private preferencesWithPendingChanges(force = false) {
    return this.cache.pending.reduce(
      (preferences, patch) => applyPreferencesPatch(preferences, patch, force),
      this.cache.preferences,
    );
  }

  async open() {
    try {
      this.cache =
        await readBrowserValue<PreferencesCache>(this.cacheKey) ?? this.cache;
      this.preferences = this.preferencesWithPendingChanges();
      await this.flush();
    } catch (error) {
      this.fail(error);
    }
  }

  change(
    next:
      | UserPreferences
      | null
      | ((current: UserPreferences | null) => UserPreferences | null),
  ) {
    const preferences = typeof next === "function"
      ? next(this.preferences)
      : next;
    if (!preferences || !this.preferences) return;
    const patch = diffPreferences(this.preferences, preferences);
    if (!hasPreferenceChanges(patch)) return;
    this.cache.pending.push(patch);
    this.preferences = preferences;
    this.notify();
    void this.saveCache()
      .then(() => this.flush())
      .catch((error) => this.fail(error));
  }

  private fail(error: unknown) {
    if (error instanceof GraphConflictError) this.conflicts = error.conflicts;
    this.notify(
      error instanceof Error
        ? error.message
        : "Could not synchronize preferences",
    );
  }

  flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.synchronize().then(
      () => {
        this.running = null;
        if (this.active && !this.conflicts.length && this.cache.pending.length) {
          return this.flush();
        }
      },
      (error) => {
        this.running = null;
        throw error;
      },
    );
    return this.running;
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
      await this.disk;
      if (!this.active || this.conflicts.length) return;
      while (this.cache.pending.length && this.active) {
        const patch = this.cache.pending[0];
        if (this.scope === "guest") {
          await saveGuestPreferences(this.cache.preferences, patch);
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
      this.preferences = this.preferencesWithPendingChanges();
      await this.saveCache();
      this.notify();
    } catch (error) {
      this.fail(error);
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
    const preferences = this.preferencesWithPendingChanges(keepMine);
    this.cache.pending = [diffPreferences(this.cache.preferences, preferences)];
    this.conflicts = [];
    this.preferences = preferences;
    await this.saveCache();
    this.notify();
    await this.flush();
  }

  async restore(preferences: UserPreferences) {
    await this.running?.catch(() => undefined);
    this.ensureActiveRestore();
    if (this.scope === "guest") await saveGuestPreferences(preferences);
    else await saveRemotePreferences(preferences);
    this.ensureActiveRestore();
    this.cache.pending = [];
    this.conflicts = [];
    await this.pullSavedPreferences();
    this.preferences = this.cache.preferences;
    await this.saveCache();
    this.notify();
  }

  private ensureActiveRestore() {
    if (!this.active) throw new Error("Your account changed during restore");
  }
}
