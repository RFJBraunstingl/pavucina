import "server-only";

import { getMongoDatabase } from "./mongodb.ts";
import {
  DEFAULT_USER_PREFERENCES,
  parseUserPreferences,
} from "./preferences-service.ts";
import type {
  UserPreferences,
  UserSettingsDocument,
} from "@/types/preferences";

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
  await (await settingsCollection()).updateOne(
    { userId },
    { $set: { settings: preferences } },
    { upsert: true },
  );
}
