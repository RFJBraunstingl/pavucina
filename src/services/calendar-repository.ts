import "server-only";

import { getMongoDatabase } from "./mongodb";
import type {
  CalendarConnectionDocument,
  CalendarSelection,
  CalendarSource,
} from "@/types/external-calendar";

let indexesPromise: Promise<unknown> | undefined;

async function connections() {
  const collection = (await getMongoDatabase()).collection<CalendarConnectionDocument>(
    "calendar_connections",
  );
  indexesPromise ??= Promise.all([
    collection.createIndex(
      { userId: 1, source: 1, providerAccountId: 1 },
      { unique: true },
    ),
    collection.createIndex({ userId: 1, source: 1 }),
  ]).catch((error) => {
    indexesPromise = undefined;
    throw error;
  });
  await indexesPromise;
  return collection;
}

export async function listCalendarConnections(userId: string) {
  return (await connections())
    .find({ userId })
    .sort({ source: 1, address: 1 })
    .toArray();
}

export async function findCalendarConnection(
  userId: string,
  connectionId: string,
) {
  return (await connections()).findOne({ _id: connectionId, userId });
}

export async function findCalendarConnectionByAccount(
  userId: string,
  source: CalendarSource,
  providerAccountId: string,
) {
  return (await connections()).findOne({ userId, source, providerAccountId });
}

export async function saveCalendarConnection(
  userId: string,
  source: CalendarSource,
  providerAccountId: string,
  address: string,
  credentials: string,
) {
  const now = new Date();
  return (await connections()).findOneAndUpdate(
    { userId, source, providerAccountId },
    {
      $set: { address, credentials, updatedAt: now },
      $setOnInsert: { _id: crypto.randomUUID(), calendars: [], createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
}

export async function updateCalendarCredentials(
  connection: CalendarConnectionDocument,
  credentials: string,
) {
  await (await connections()).updateOne(
    { _id: connection._id, userId: connection.userId },
    { $set: { credentials, updatedAt: new Date() } },
  );
}

export async function updateCalendarSelections(
  userId: string,
  connectionId: string,
  calendars: CalendarSelection[],
) {
  return (await connections()).updateOne(
    { _id: connectionId, userId },
    { $set: { calendars, updatedAt: new Date() } },
  );
}

export async function deleteCalendarConnection(
  userId: string,
  connectionId: string,
) {
  return (await connections()).deleteOne({ _id: connectionId, userId });
}
