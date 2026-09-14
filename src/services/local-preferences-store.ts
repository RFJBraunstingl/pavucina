import { DEFAULT_USER_PREFERENCES, parseUserPreferences } from "./preferences-service.ts";
import { browserDatabase, idbRequest, idbCompletion } from "./browser-database.ts";
import { applyPreferencesPatch } from "./settings-patch-service.ts";
import type { SettingsPatch } from "../types/settings-sync.ts";
import { changedFields } from "../utils/field-changes.ts";
import type { UserPreferences } from "../types/preferences.ts";

export async function loadGuestPreferences() {
  const transaction = (await browserDatabase()).transaction("meta", "readonly");
  const store = transaction.objectStore("meta");
  const keys = await idbRequest(store.getAllKeys());
  const values = await idbRequest(store.getAll());
  const fields = Object.fromEntries(keys.flatMap((key, index) => typeof key === "string" && key.startsWith("preference:") ? [[key.slice(11), values[index]]] : []));
  const saved = parseUserPreferences(fields);
  if (saved) return saved;
  let legacy: unknown;
  try { legacy = JSON.parse(localStorage.getItem("pavucina.preferences.v1") ?? "null"); } catch { legacy = null; }
  const preferences = parseUserPreferences(legacy) ?? DEFAULT_USER_PREFERENCES;
  await saveGuestPreferences(preferences);
  return preferences;
}
export async function saveGuestPreferences(preferences: UserPreferences, patch?: SettingsPatch) {
  const transaction = (await browserDatabase()).transaction("meta", "readwrite");
  const completed = idbCompletion(transaction);
  const store = transaction.objectStore("meta");
  const keys = await idbRequest(store.getAllKeys()), values = await idbRequest(store.getAll());
  const before = Object.fromEntries(keys.flatMap((key, index) => typeof key === "string" && key.startsWith("preference:") ? [[key.slice(11), values[index]]] : []));
  if (patch) preferences = applyPreferencesPatch(parseUserPreferences(before) ?? DEFAULT_USER_PREFERENCES, patch);
  for (const [key, change] of Object.entries(changedFields(before, { ...preferences }))) {
    if (change.after === undefined) store.delete(`preference:${key}`);
    else store.put(change.after, `preference:${key}`);
  }
  await completed; return true;
}
