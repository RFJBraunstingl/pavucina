import "server-only";

import { applyPreferencesPatch } from "../settings-patch-service.ts";
import { changedFields } from "@/utils/shared/field-changes.ts";
import type { SettingsPatch } from "@/types/preferences/settings-sync.ts";
import { getMongoDatabase } from "@/services/infrastructure/mongodb.ts";
import {
  DEFAULT_USER_PREFERENCES,
  parseUserPreferences,
} from "../preferences-service.ts";
import type {
  UserPreferences,
  UserSettingsDocument,
} from "@/types/preferences/preferences";

let indexPromise: Promise<string> | undefined;

async function settingsCollection() {
  const database = await getMongoDatabase();
  const collection = database.collection<UserSettingsDocument>("settings");
  indexPromise ??= collection
    .createIndex({ userId: 1 }, { unique: true })
    .catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  await indexPromise;
  return collection;
}

export async function loadPreferences(userId: string) {
  const document = await (await settingsCollection()).findOne({
    userId,
  });
  if (!document) return DEFAULT_USER_PREFERENCES;
  const preferences = parseUserPreferences(document.settings);
  if (!preferences) {
    throw new Error("Stored user preferences are invalid");
  }
  return preferences;
}

export async function savePreferences(
  userId: string,
  preferences: UserPreferences,
) {
  const current = await loadPreferences(userId);
  const fields = changedFields({ ...current }, { ...preferences });
  await patchPreferences(userId, { fields });
}

export async function updateCalendarImportPreference(
  userId: string,
  enabled: boolean,
) {
  const current = await loadPreferences(userId);
  await patchPreferences(userId, { fields: { calendarEventImportEnabled: { before: current.calendarEventImportEnabled, after: enabled } } });
}

export async function patchPreferences(userId: string, patch: SettingsPatch) {
  const collection = await settingsCollection();
  await collection.updateOne({ userId }, { $setOnInsert: { userId, settings: DEFAULT_USER_PREFERENCES } }, { upsert: true });
  for (let retry = 0; retry < 5; retry++) {
    const document = (await collection.findOne({ userId }))!;
    const current = parseUserPreferences(document.settings);
    if (!current) throw new Error("Stored preferences are invalid");
    const next = applyPreferencesPatch(current, patch);
    const changes = changedFields({ ...current }, { ...next });
    if (!Object.keys(changes).length) return next;
    const revision = (document.revision ?? 0) + 1;
    const set: Record<string, unknown> = { revision }, unset: Record<string, ""> = {};
    for (const [key, change] of Object.entries(changes)) {
      set[`fieldRevisions.${key}`] = revision;
      if (change.after === undefined) unset[`settings.${key}`] = "";
      else set[`settings.${key}`] = change.after;
    }
    const result = await collection.updateOne({ userId, settings: document.settings }, {
      ...(Object.keys(set).length && { $set: set }), ...(Object.keys(unset).length && { $unset: unset }),
    });
    if (result.matchedCount) return next;
  }
  throw new Error("Preferences are changing. Please retry.");
}

export async function preferenceChanges(userId: string, after = -1) {
  const document = await (await settingsCollection()).findOne({ userId });
  const preferences = document ? parseUserPreferences(document.settings) : DEFAULT_USER_PREFERENCES;
  if (!preferences) throw new Error("Stored preferences are invalid");
  const fields: Record<string, { after?: unknown }> = {};
  for (const key of new Set([...Object.keys(preferences), ...Object.keys(document?.fieldRevisions ?? {})])) {
    if (after < 0 || (document?.fieldRevisions?.[key] ?? 0) > after) fields[key] = { after: preferences[key as keyof UserPreferences] };
  }
  return { revision: document?.revision ?? 0, fields };
}
