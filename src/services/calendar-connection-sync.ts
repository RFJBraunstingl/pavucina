import "server-only";

import {
  createCalendarRequest,
  listProviderCalendars,
} from "./calendar-provider.ts";
import { syncGoogleCalendar } from "./google-calendar-sync.ts";
import { syncOutlookCalendar } from "./outlook-calendar-sync.ts";
import { addDays } from "../utils/date.ts";
import type {
  CalendarConnectionDocument,
  CalendarEventSyncState,
  CalendarImportError,
  CalendarSyncBatch,
  ProviderCalendar,
} from "../types/external-calendar.ts";
import type { OAuthRequest } from "../types/oauth.ts";

export type ConnectionSync = {
  batches: CalendarSyncBatch[];
  calendars?: ProviderCalendar[];
  errors: CalendarImportError[];
  states: CalendarEventSyncState[];
};

function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts();
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function syncRange(
  state: CalendarEventSyncState | undefined,
  today: string,
  timeZone: string,
) {
  if (state && state.timeZone === timeZone && today < state.refreshAfter) {
    return {
      rangeStart: state.rangeStart,
      rangeEnd: state.rangeEnd,
      refreshAfter: state.refreshAfter,
      cursor: state.cursor,
    };
  }
  return {
    rangeStart: addDays(today, -30),
    rangeEnd: addDays(today, 396),
    refreshAfter: addDays(today, 30),
    cursor: undefined,
  };
}

async function syncCalendar(
  connection: CalendarConnectionDocument,
  calendar: ProviderCalendar,
  timeZone: string,
  request: OAuthRequest,
) {
  const previous = connection.eventSyncStates?.find(
    ({ calendarId }) => calendarId === calendar.id,
  );
  const range = syncRange(previous, todayInTimeZone(timeZone), timeZone);
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
): Promise<ConnectionSync> {
  const request = createCalendarRequest(connection);
  let calendars: ProviderCalendar[];
  try {
    const saved = new Map(connection.calendars.map((calendar) => [calendar.id, calendar]));
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
      return await syncCalendar(connection, calendar, timeZone, request);
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
  return {
    batches: succeeded.map(({ batch }) => batch),
    calendars,
    errors: results.flatMap((result) => "error" in result ? [result.error] : []),
    states: [
      ...succeeded.map(({ state }) => state),
      ...(connection.eventSyncStates ?? []).filter(({ calendarId }) =>
        failedIds.has(calendarId) && calendars.some(({ id }) => id === calendarId)),
    ],
  };
}
