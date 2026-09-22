import "server-only";

import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import type {
  CalendarConnectionDocument,
  CalendarEventSyncState,
  CalendarSource,
} from "@/types/calendar/events/external-calendar";

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

export async function updateCalendarEventSyncStates(
  userId: string,
  connectionId: string,
  before: CalendarEventSyncState[],
  after: CalendarEventSyncState[],
) {
  const collection = await connections();
  const calendarIds = new Set(
    [...before, ...after].map((state) => state.calendarId),
  );
  for (const calendarId of calendarIds) {
    const previous = before.find((state) => state.calendarId === calendarId);
    const next = after.find((state) => state.calendarId === calendarId);
    if (JSON.stringify(previous) === JSON.stringify(next)) continue;
    const onlyIfSyncStateUnchanged = {
      _id: connectionId,
      userId,
      eventSyncStates: previous
        ? { $elemMatch: previous }
        : { $not: { $elemMatch: { calendarId } } },
    };
    if (!next) {
      await collection.updateOne(onlyIfSyncStateUnchanged, {
        $pull: { eventSyncStates: { calendarId } },
      });
    } else if (previous) {
      await collection.updateOne(onlyIfSyncStateUnchanged, {
        $set: { "eventSyncStates.$": next },
      });
    } else {
      await collection.updateOne(onlyIfSyncStateUnchanged, {
        $push: { eventSyncStates: next },
      });
    }
  }
}

export async function clearCalendarEventSyncStates(userId: string) {
  return (await connections()).updateMany(
    { userId },
    { $set: { eventSyncStates: [], updatedAt: new Date() } },
  );
}

export async function deleteCalendarConnection(
  userId: string,
  connectionId: string,
) {
  return (await connections()).deleteOne({ _id: connectionId, userId });
}
