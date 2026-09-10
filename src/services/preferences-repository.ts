import "server-only";

import { getMongoDatabase } from "./mongodb.ts";
import {
  DEFAULT_USER_PREFERENCES,
  isUserPreferences,
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
  if (!isUserPreferences(document.settings)) {
    throw new Error("Stored user preferences are invalid");
  }
  return document.settings;
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
