import {
  browserDatabase,
  idbCompletion,
  idbRequest,
} from "@/services/graph/client/browser-database.ts";
import { changedFields } from "@/utils/shared/field-changes.ts";
import {
  DEFAULT_USER_PREFERENCES,
  parseUserPreferences,
} from "../preferences-service.ts";
import { applyPreferencesPatch } from "../patch/settings-patch-service.ts";
import type { UserPreferences } from "@/types/preferences/preferences.ts";
import type { SettingsPatch } from "@/types/preferences/settings-sync.ts";

const PREFERENCE_PREFIX = "preference:";
const LEGACY_STORAGE_KEY = "pavucina.preferences.v1";

async function storedPreferenceFields(store: IDBObjectStore) {
  const keys = await idbRequest(store.getAllKeys());
  const values = await idbRequest(store.getAll());
  return Object.fromEntries(
    keys.flatMap((key, index) =>
      typeof key === "string" && key.startsWith(PREFERENCE_PREFIX)
        ? [[key.slice(PREFERENCE_PREFIX.length), values[index]]]
        : [],
    ),
  );
}

function legacyPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? "null");
    return parseUserPreferences(saved);
  } catch {
    return null;
  }
}

export async function loadGuestPreferences() {
  const database = await browserDatabase();
  const transaction = database.transaction("meta", "readonly");
  const fields = await storedPreferenceFields(transaction.objectStore("meta"));
  const saved = parseUserPreferences(fields);
  if (saved) return saved;
  const preferences = legacyPreferences() ?? DEFAULT_USER_PREFERENCES;
  await saveGuestPreferences(preferences);
  return preferences;
}

async function updateGuestPreferences(
  update: (current: UserPreferences) => UserPreferences,
) {
  const database = await browserDatabase();
  const transaction = database.transaction("meta", "readwrite");
  const completed = idbCompletion(transaction);
  const store = transaction.objectStore("meta");
  const before = await storedPreferenceFields(store);
  const current = parseUserPreferences(before) ?? DEFAULT_USER_PREFERENCES;
  const next = update(current);

  for (const [key, change] of Object.entries(
    changedFields(before, { ...next }),
  )) {
    const storageKey = `${PREFERENCE_PREFIX}${key}`;
    if (change.after === undefined) store.delete(storageKey);
    else store.put(change.after, storageKey);
  }
  await completed;
  return true;
}

export function saveGuestPreferences(preferences: UserPreferences) {
  return updateGuestPreferences(() => preferences);
}

export function applyGuestPreferencePatch(patch: SettingsPatch) {
  return updateGuestPreferences((current) =>
    applyPreferencesPatch(current, patch),
  );
}
