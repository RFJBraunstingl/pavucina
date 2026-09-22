import "server-only";

import type { AnyBulkWriteOperation } from "mongodb";

import { calendarConnections } from "../calendar-repository";
import { equalValue } from "@/utils/shared/field-changes";
import type {
  CalendarConnectionDocument,
  CalendarEventSyncState,
} from "@/types/calendar/events/external-calendar";

export async function updateCalendarEventSyncStates(
  userId: string,
  connectionId: string,
  before: CalendarEventSyncState[],
  after: CalendarEventSyncState[],
) {
  const collection = await calendarConnections();
  const previousById = new Map(before.map((state) => [state.calendarId, state]));
  const nextById = new Map(after.map((state) => [state.calendarId, state]));
  const calendarIds = new Set(
    [...before, ...after].map((state) => state.calendarId),
  );
  const operations: AnyBulkWriteOperation<CalendarConnectionDocument>[] = [];

  for (const calendarId of calendarIds) {
    const previous = previousById.get(calendarId);
    const next = nextById.get(calendarId);
    if (equalValue(previous, next)) continue;
    const unchangedSyncState = {
      _id: connectionId,
      userId,
      eventSyncStates: previous
        ? { $elemMatch: previous }
        : { $not: { $elemMatch: { calendarId } } },
    };

    if (!next) {
      operations.push({
        updateOne: {
          filter: unchangedSyncState,
          update: { $pull: { eventSyncStates: { calendarId } } },
        },
      });
    } else if (previous) {
      operations.push({
        updateOne: {
          filter: unchangedSyncState,
          update: { $set: { "eventSyncStates.$": next } },
        },
      });
    } else {
      operations.push({
        updateOne: {
          filter: unchangedSyncState,
          update: { $push: { eventSyncStates: next } },
        },
      });
    }
  }

  if (operations.length) {
    await collection.bulkWrite(operations, { ordered: false });
  }
}

export async function clearCalendarEventSyncStates(userId: string) {
  return (await calendarConnections()).updateMany(
    { userId },
    { $set: { eventSyncStates: [], updatedAt: new Date() } },
  );
}
