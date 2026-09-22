import "server-only";

import {
  listProviderCalendars,
} from "../calendar-provider.ts";
import { createCalendarRequest } from "../calendar-auth.ts";
import { syncGoogleCalendar } from "../google/google-calendar-sync.ts";
import { syncOutlookCalendar } from "../outlook/outlook-calendar-sync.ts";
import { calendarSyncWindow, todayInTimeZone } from "./calendar-sync-window.ts";
import type {
  CalendarConnectionSync,
  CalendarConnectionDocument,
  CalendarEventSyncState,
  CalendarImportError,
  CalendarSyncBatch,
  ProviderCalendar,
} from "@/types/calendar/events/external-calendar.ts";
import type { OAuthRequest } from "@/types/auth/oauth.ts";

async function syncCalendar(
  connection: CalendarConnectionDocument,
  calendar: ProviderCalendar,
  today: string,
  timeZone: string,
  request: OAuthRequest,
) {
  const previous = connection.eventSyncStates?.find(
    ({ calendarId }) => calendarId === calendar.id,
  );
  const range = calendarSyncWindow(previous, today, timeZone);
  const result = connection.source === "google"
    ? await syncGoogleCalendar(
        connection, calendar, request, range.rangeStart, range.rangeEnd,
        timeZone, range.cursor,
      )
    : await syncOutlookCalendar(
        connection, calendar, request, range.rangeStart, range.rangeEnd,
        range.cursor,
      );
  const state: CalendarEventSyncState = {
    calendarId: calendar.id,
    cursor: result.cursor,
    rangeStart: range.rangeStart,
    rangeEnd: range.rangeEnd,
    refreshAfter: range.refreshAfter,
    timeZone,
    syncedAt: new Date(),
  };
  return {
    batch: {
      connectionId: connection._id,
      source: connection.source,
      calendar,
      changes: result.changes,
      authoritative: result.authoritative,
      state,
    } satisfies CalendarSyncBatch,
    state,
  };
}

export async function syncCalendarConnection(
  connection: CalendarConnectionDocument,
  timeZone: string,
): Promise<CalendarConnectionSync> {
  const request = createCalendarRequest(connection);
  let today: string;
  let calendars: ProviderCalendar[];
  try {
    today = todayInTimeZone(timeZone);
    const saved = new Map(
      connection.calendars.map((calendar) => [calendar.id, calendar]),
    );
    calendars = (await listProviderCalendars(connection, request)).map((calendar) => ({
      ...calendar,
      color: saved.get(calendar.id)?.color ?? calendar.color,
    }));
  } catch (error) {
    return {
      batches: [],
      errors: [{
        connectionId: connection._id,
        message: error instanceof Error ? error.message : "Could not list calendars",
      }],
      states: connection.eventSyncStates ?? [],
    };
  }
  const results = await Promise.all(calendars.map(async (calendar) => {
    try {
      return await syncCalendar(connection, calendar, today, timeZone, request);
    } catch (error) {
      return { error: {
        connectionId: connection._id,
        calendarId: calendar.id,
        message: error instanceof Error ? error.message : "Could not import calendar",
      } satisfies CalendarImportError };
    }
  }));
  const succeeded = results.flatMap((result) => "batch" in result ? [result] : []);
  const failedIds = new Set(results.flatMap((result) =>
    "error" in result && result.error.calendarId ? [result.error.calendarId] : []));
  const calendarIds = new Set(calendars.map(({ id }) => id));
  return {
    batches: succeeded.map(({ batch }) => batch),
    calendars,
    errors: results.flatMap((result) => "error" in result ? [result.error] : []),
    states: [
      ...succeeded.map(({ state }) => state),
      ...(connection.eventSyncStates ?? []).filter(({ calendarId }) =>
        failedIds.has(calendarId) && calendarIds.has(calendarId)),
    ],
  };
}
