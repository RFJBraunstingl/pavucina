import "server-only";

import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import type {
  CalendarConnectionDocument,
  CalendarSource,
} from "@/types/calendar/events/external-calendar";

let indexesPromise: Promise<unknown> | undefined;

export async function calendarConnections() {
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
  return (await calendarConnections())
    .find({ userId })
    .sort({ source: 1, address: 1 })
    .toArray();
}

export async function findCalendarConnection(
  userId: string,
  connectionId: string,
) {
  return (await calendarConnections()).findOne({ _id: connectionId, userId });
}

export async function findCalendarConnectionByAccount(
  userId: string,
  source: CalendarSource,
  providerAccountId: string,
) {
  return (await calendarConnections()).findOne({ userId, source, providerAccountId });
}

export async function saveCalendarConnection(
  userId: string,
  source: CalendarSource,
  providerAccountId: string,
  address: string,
  credentials: string,
) {
  const now = new Date();
  return (await calendarConnections()).findOneAndUpdate(
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
  await (await calendarConnections()).updateOne(
    { _id: connection._id, userId: connection.userId },
    { $set: { credentials, updatedAt: new Date() } },
  );
}

export async function deleteCalendarConnection(
  userId: string,
  connectionId: string,
) {
  return (await calendarConnections()).deleteOne({ _id: connectionId, userId });
}
