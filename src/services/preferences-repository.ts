import "server-only";

import { getMongoDatabase } from "./mongodb.ts";
import {
  DEFAULT_USER_PREFERENCES,
  isUserPreferences,
} from "./preferences-service.ts";
import { preferenceStorageUserId } from "./user-identity.ts";
import type {
  UserPreferences,
  UserPreferencesDocument,
} from "@/types/preferences";

let indexPromise: Promise<string> | undefined;

async function preferencesCollection() {
  const database = await getMongoDatabase();
  const collection = database.collection<UserPreferencesDocument>("preferences");
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
  const storageUserId = preferenceStorageUserId(userId);
  const document = await (await preferencesCollection()).findOne({
    userId: storageUserId,
  });
  if (!document) return DEFAULT_USER_PREFERENCES;
  if (!isUserPreferences(document.preferences)) {
    throw new Error("Stored user preferences are invalid");
  }
  return document.preferences;
}

export async function savePreferences(
  userId: string,
  preferences: UserPreferences,
) {
  const storageUserId = preferenceStorageUserId(userId);
  await (await preferencesCollection()).updateOne(
    { userId: storageUserId },
    { $set: { preferences } },
    { upsert: true },
  );
}
