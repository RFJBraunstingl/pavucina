import "server-only";
import { getMongoDatabase } from "./mongodb";
import { findCalendarConnection } from "./calendar-repository";
import { applyCalendarSelectionChanges } from "./calendar-selection-patch";
import type { CalendarSelectionChange } from "../types/calendar-selection-patch";
import type { CalendarConnectionDocument } from "../types/external-calendar";

export async function patchCalendarSelections(userId: string, connectionId: string, changes: CalendarSelectionChange[]) {
  const collection = (await getMongoDatabase()).collection<CalendarConnectionDocument>("calendar_connections");
  for (let retry = 0; retry < 5; retry++) {
    const connection = await findCalendarConnection(userId, connectionId);
    if (!connection) return false;
    const next = applyCalendarSelectionChanges(connection.calendars, changes);
    const pipeline = changes.map((change) => {
      const replacement = next.find(({ id }) => id === change.id);
      const removed = { $filter: { input: "$calendars", as: "calendar", cond: { $ne: ["$$calendar.id", { $literal: change.id }] } } };
      return { $set: { calendars: replacement
        ? { $cond: [{ $in: [{ $literal: change.id }, "$calendars.id"] },
          { $map: { input: "$calendars", as: "calendar", in: { $cond: [{ $eq: ["$$calendar.id", { $literal: change.id }] }, { $literal: replacement }, "$$calendar"] } } },
          { $concatArrays: ["$calendars", { $literal: [replacement] }] }] }
        : removed } };
    });
    if (!pipeline.length) return true;
    const result = await collection.updateOne({ _id: connectionId, userId, calendars: connection.calendars }, pipeline);
    if (result.matchedCount) return true;
  }
  throw new Error("Calendar settings are changing. Please retry.");
}
