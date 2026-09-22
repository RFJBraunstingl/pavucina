import "server-only";

import type { Document } from "mongodb";

import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import { findCalendarConnection } from "../../providers/calendar-repository";
import { applyCalendarSelectionChanges } from "../calendar-selection-patch";
import type { CalendarSelectionChange } from "@/types/calendar/calendar-selection-patch";
import type {
  CalendarConnectionDocument,
  CalendarSelection,
} from "@/types/calendar/events/external-calendar";

const MAX_PATCH_ATTEMPTS = 5;

function withoutCalendar(id: string) {
  return {
    $filter: {
      input: "$calendars",
      as: "calendar",
      cond: { $ne: ["$$calendar.id", { $literal: id }] },
    },
  };
}

function withCalendar(id: string, replacement: CalendarSelection) {
  return {
    $cond: [
      { $in: [{ $literal: id }, "$calendars.id"] },
      {
        $map: {
          input: "$calendars",
          as: "calendar",
          in: {
            $cond: [
              { $eq: ["$$calendar.id", { $literal: id }] },
              { $literal: replacement },
              "$$calendar",
            ],
          },
        },
      },
      { $concatArrays: ["$calendars", { $literal: [replacement] }] },
    ],
  };
}

function selectionUpdatePipeline(
  changes: CalendarSelectionChange[],
  next: CalendarSelection[],
): Document[] {
  return changes.map((change) => {
    const replacement = next.find(({ id }) => id === change.id);
    return {
      $set: {
        calendars: replacement
          ? withCalendar(change.id, replacement)
          : withoutCalendar(change.id),
      },
    };
  });
}

export async function patchCalendarSelections(
  userId: string,
  connectionId: string,
  changes: CalendarSelectionChange[],
) {
  const database = await getMongoDatabase();
  const collection = database.collection<CalendarConnectionDocument>(
    "calendar_connections",
  );

  for (let attempt = 0; attempt < MAX_PATCH_ATTEMPTS; attempt++) {
    const connection = await findCalendarConnection(userId, connectionId);
    if (!connection) return false;
    const next = applyCalendarSelectionChanges(connection.calendars, changes);
    const pipeline = selectionUpdatePipeline(changes, next);
    if (!pipeline.length) return true;
    const result = await collection.updateOne(
      { _id: connectionId, userId, calendars: connection.calendars },
      pipeline,
    );
    if (result.matchedCount) return true;
  }
  throw new Error("Calendar settings are changing. Please retry.");
}
