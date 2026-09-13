import assert from "node:assert/strict";
import test from "node:test";
import { calendarPosition, layoutCalendarItems } from "../utils/calendar.ts";
import { calendarFreeGaps, defaultCalendarEvent, suggestCalendarEvent } from "../utils/calendar-creation.ts";

const day = "2026-09-13";
const item = (start: string, end: string, endDate = day) =>
  calendarPosition(crypto.randomUUID(), day, endDate, start, end, day)!;
const times = (range: ReturnType<typeof suggestCalendarEvent>) =>
  range && [range.startTime, range.endTime];

test("creation fills short free gaps and caps longer suggestions at one hour", () => {
  const items = [item("08:00", "09:00"), item("09:30", "10:00")];
  assert.deepEqual(times(suggestCalendarEvent(items, day, 9 * 60 + 10)), ["09:00", "09:30"]);
  assert.deepEqual(times(suggestCalendarEvent(items, day, 11 * 60 + 8)), ["11:15", "12:15"]);
  assert.deepEqual(times(suggestCalendarEvent([item("12:00", "13:00")], day, 11 * 60 + 40)), ["11:45", "12:00"]);
  assert.equal(suggestCalendarEvent(items, day, 9 * 60 + 30), null);
  assert.equal(suggestCalendarEvent(items, day, -1), null);
  assert.equal(suggestCalendarEvent(items, day, 1440), null);
  assert.equal(suggestCalendarEvent(items, day, NaN), null);
});

test("free slots merge overlaps and use real times instead of minimum visual heights", () => {
  const items = [item("08:00", "09:07"), item("08:30", "09:05"), item("09:11", "10:00")];
  assert.deepEqual(calendarFreeGaps(items, day), [[0, 480], [547, 551], [600, 1440]]);
  assert.deepEqual(times(suggestCalendarEvent(items, day, 549)), ["09:07", "09:11"]);
  assert.equal(suggestCalendarEvent(items, day, 9 * 60 + 6), null);
  assert.deepEqual(times(suggestCalendarEvent([item("09:07", "09:08")], day, 9 * 60 + 8)), ["09:15", "10:15"]);
  assert.deepEqual(times(suggestCalendarEvent([item("09:06", "09:07")], day, 9 * 60 + 7)), ["09:15", "10:15"]);
});

test("midnight clips suggestions and correctly occupies overlapping lanes", () => {
  assert.deepEqual(suggestCalendarEvent([], day, 23 * 60 + 30), {
    startDate: day, endDate: "2026-09-14", startTime: "23:30", endTime: "00:00",
  });
  assert.deepEqual(times(suggestCalendarEvent([], day, 1439)), ["23:45", "00:00"]);
  assert.deepEqual(times(suggestCalendarEvent([item("00:00", "23:59")], day, 1439)), ["23:59", "00:00"]);
  assert.ok(item("23:59", "00:00", "2026-09-14"));
  const items = [item("22:00", "00:00", "2026-09-14"), item("23:00", "23:30")];
  assert.equal(suggestCalendarEvent(items, day, 23 * 60 + 45), null);
  assert.deepEqual(layoutCalendarItems(items).map(({ laneCount }) => laneCount), [2, 2]);
  assert.deepEqual(calendarFreeGaps([item("00:00", "00:00", "2026-09-14")], day), []);
});

test("keyboard creation finds free time after nine or falls back on a fully occupied day", () => {
  assert.deepEqual(times(defaultCalendarEvent([item("08:00", "11:00")], day)), ["11:00", "12:00"]);
  assert.deepEqual(times(defaultCalendarEvent([item("00:00", "00:00", "2026-09-14")], day)), ["09:00", "10:00"]);
  assert.deepEqual(times(defaultCalendarEvent([], day)), ["09:00", "10:00"]);
  assert.deepEqual(times(defaultCalendarEvent([item("00:00", "08:50"), item("09:10", "10:00")], day)), ["09:00", "09:10"]);
});
