import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeGoogleCalendarEvent,
  normalizeOutlookCalendarEvent,
} from "./core/calendar-event.ts";
import { calendarItem, layoutCalendarItems } from "@/utils/calendar/calendar.ts";
import {
  allDayEventsForDay,
  externalCalendarItems,
  parseCalendarSelections,
} from "@/utils/calendar/external-calendar.ts";
import type {
  CalendarConnectionDocument,
  CalendarSelection,
  ExternalCalendarEvent,
} from "@/types/calendar/external-calendar.ts";
import type { TaskNode } from "@/types/graph/graph.ts";

const connection: CalendarConnectionDocument = {
  _id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  source: "google",
  providerAccountId: "account",
  address: "person@example.com",
  credentials: "encrypted",
  calendars: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};
const calendar: CalendarSelection = {
  id: "primary",
  name: "Work",
  color: "#4285f4",
  visible: true,
};

test("calendar selections validate and normalize colors", () => {
  assert.deepEqual(
    parseCalendarSelections([
      { ...calendar, name: " Work ", color: "#ABCDEF" },
    ]),
    [{ ...calendar, name: "Work", color: "#abcdef" }],
  );
  assert.equal(parseCalendarSelections([{ ...calendar, color: "blue" }]), null);
  assert.equal(parseCalendarSelections([calendar, calendar]), null);
  assert.equal(parseCalendarSelections(Array.from(
    { length: 101 },
    (_, index) => ({ ...calendar, id: String(index) }),
  )), null);
});

test("Google and Outlook events normalize to one safe shape", () => {
  const google = normalizeGoogleCalendarEvent(connection, calendar, {
    id: "g1",
    summary: "Planning",
    htmlLink: "https://calendar.google.com/event",
    start: { dateTime: "2026-09-07T09:00:00+02:00" },
    end: { dateTime: "2026-09-07T10:00:00+02:00" },
  });
  assert.equal(google?.title, "Planning");
  assert.equal(google?.start, "2026-09-07T07:00:00.000Z");

  const outlook = normalizeOutlookCalendarEvent(
    { ...connection, source: "outlook" },
    calendar,
    {
      id: "o1",
      subject: "",
      isAllDay: true,
      start: { dateTime: "2026-09-08T00:00:00", timeZone: "UTC" },
      end: { dateTime: "2026-09-09T00:00:00", timeZone: "UTC" },
      webLink: "javascript:alert(1)",
    },
  );
  assert.equal(outlook?.title, "(Busy)");
  assert.equal(outlook?.allDay, true);
  assert.equal(outlook?.start, "2026-09-08");
  assert.equal(outlook?.url, undefined);
});

test("external events share lanes with tasks and split overnight", () => {
  const days = ["2026-09-07", "2026-09-08"];
  const start = new Date(2026, 8, 7, 22).toISOString();
  const end = new Date(2026, 8, 8, 6).toISOString();
  const event: ExternalCalendarEvent = {
    id: "overnight",
    connectionId: connection._id,
    calendarId: calendar.id,
    calendarName: calendar.name,
    title: "Overnight",
    color: calendar.color,
    allDay: false,
    start,
    end,
  };
  const segments = externalCalendarItems([event], days);
  assert.deepEqual(
    segments.map(({ startDate, startTime, endTime }) => [startDate, startTime, endTime]),
    [
      ["2026-09-07", "22:00", "00:00"],
      ["2026-09-08", "00:00", "06:00"],
    ],
  );

  const task = {
    id: "task",
    type: "task",
    properties: { name: "Task" },
  } satisfies TaskNode;
  const timed = { ...event, id: "meeting", start: new Date(2026, 8, 7, 22).toISOString(), end: new Date(2026, 8, 7, 22, 30).toISOString() };
  const laidOut = layoutCalendarItems([
    calendarItem(task, days[0], days[0], "22:00", "22:30", days[0])!,
    ...externalCalendarItems([timed], days),
  ]);
  assert.deepEqual(laidOut.map(({ laneCount }) => laneCount), [2, 2]);
});

test("all-day events use an exclusive end date", () => {
  const event: ExternalCalendarEvent = {
    id: "all-day",
    connectionId: connection._id,
    calendarId: calendar.id,
    calendarName: calendar.name,
    title: "Conference",
    color: calendar.color,
    allDay: true,
    start: "2026-09-07",
    end: "2026-09-09",
  };
  assert.equal(allDayEventsForDay([event], "2026-09-08").length, 1);
  assert.equal(allDayEventsForDay([event], "2026-09-09").length, 0);
});
