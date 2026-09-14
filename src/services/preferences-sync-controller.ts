import { loadGuestPreferences, saveGuestPreferences } from "./local-preferences-store.ts";
import { sendPreferencePatch, pullPreferenceChanges, saveRemotePreferences } from "./remote-preferences-store.ts";
import { applyPreferencesPatch, diffPreferences } from "./settings-patch-service.ts";
import { DEFAULT_USER_PREFERENCES } from "./preferences-service.ts";
import { GraphConflictError } from "./graph-patch-service.ts";
import { readBrowserValue, writeBrowserValue } from "./browser-database.ts";
import type { UserPreferences } from "../types/preferences.ts";
import type { PreferencesCache, PreferencesView } from "../types/preferences-sync.ts";

export class PreferencesSyncController {
  private cache: PreferencesCache = { preferences: DEFAULT_USER_PREFERENCES, revision: -1, pending: [] };
  private key: string;
  private running: Promise<void> | null = null;
  private disk = Promise.resolve();
  preferences: UserPreferences | null = null;
  conflicts: PreferencesView["conflicts"] = [];
  active = true;
  private scope: string;
  private listener: (state: PreferencesView) => void;
  constructor(scope: string, listener: (state: PreferencesView) => void) {
    this.scope = scope; this.listener = listener;
    const tab = sessionStorage.getItem("pavucina.tab") ?? crypto.randomUUID();
    sessionStorage.setItem("pavucina.tab", tab);
    this.key = `${scope}:${tab}:preferences`;
  }
  private emit(error: string | null = null) { if (this.active) this.listener({ preferences: this.preferences, error, conflicts: this.conflicts }); }
  private persist() {
    const cache = structuredClone(this.cache);
    this.disk = this.disk.catch(() => undefined).then(() => writeBrowserValue(this.key, cache));
    return this.disk;
  }
  private overlay(force = false) { return this.cache.pending.reduce((value, patch) => applyPreferencesPatch(value, patch, force), this.cache.preferences); }
  async open() {
    try {
      this.cache = await readBrowserValue<PreferencesCache>(this.key) ?? this.cache;
      this.preferences = this.overlay();
      await this.flush();
    } catch (error) { this.fail(error); }
  }
  change(next: UserPreferences | null | ((current: UserPreferences | null) => UserPreferences | null)) {
    const preferences = typeof next === "function" ? next(this.preferences) : next;
    if (!preferences || !this.preferences) return;
    const patch = diffPreferences(this.preferences, preferences);
    if (!Object.keys(patch.fields).length && !patch.collapsed?.add.length && !patch.collapsed?.remove.length) return;
    this.cache.pending.push(patch); this.preferences = preferences;
    this.emit(); void this.persist().then(() => this.flush()).catch((error) => this.fail(error));
  }
  private fail(error: unknown) {
    if (error instanceof GraphConflictError) this.conflicts = error.conflicts;
    this.emit(error instanceof Error ? error.message : "Could not synchronize preferences");
  }
  flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.synchronize().then(() => {
      this.running = null;
      if (this.active && !this.conflicts.length && this.cache.pending.length) return this.flush();
    }, (error) => { this.running = null; throw error; });
    return this.running;
  }
  private async pull() {
    if (this.scope === "guest") this.cache.preferences = await loadGuestPreferences();
    else {
      const changes = await pullPreferenceChanges(this.cache.revision);
      this.cache.preferences = applyPreferencesPatch(this.cache.preferences, { fields: changes.fields }, true);
      this.cache.revision = changes.revision;
    }
  }
  private async synchronize() {
    try {
      await this.disk;
      if (!this.active || this.conflicts.length) return;
      while (this.cache.pending.length && this.active) {
        const patch = this.cache.pending[0];
        if (this.scope === "guest") await saveGuestPreferences(this.cache.preferences, patch);
        else await sendPreferencePatch(patch);
        if (!this.active) return;
        this.cache.pending.shift(); await this.pull();
        if (!this.active) return;
        await this.persist();
      }
      if (!this.active) return;
      await this.pull();
      if (!this.active) return;
      this.preferences = this.overlay(); await this.persist(); this.emit();
    } catch (error) { this.fail(error); throw error; }
  }
  async resolve(keepMine: boolean) {
    await this.pull();
    if (!keepMine) this.cache.pending = this.cache.pending.map((patch) => ({ ...patch,
      fields: Object.fromEntries(Object.entries(patch.fields).filter(([key]) => !this.conflicts.some((conflict) => conflict.field === key))) }));
    const preferences = this.overlay(keepMine);
    this.cache.pending = [diffPreferences(this.cache.preferences, preferences)];
    this.conflicts = []; this.preferences = preferences;
    await this.persist(); this.emit(); await this.flush();
  }
  async restore(preferences: UserPreferences) {
    await this.running?.catch(() => undefined);
    if (!this.active) throw new Error("Your account changed during restore");
    if (this.scope === "guest") await saveGuestPreferences(preferences);
    else await saveRemotePreferences(preferences);
    if (!this.active) throw new Error("Your account changed during restore");
    this.cache.pending = []; this.conflicts = [];
    await this.pull(); this.preferences = this.cache.preferences; await this.persist(); this.emit();
  }
}
