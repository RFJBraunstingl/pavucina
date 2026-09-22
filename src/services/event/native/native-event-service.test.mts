import assert from "node:assert/strict";
import test from "node:test";
import { BSON } from "mongodb";
import { createSeedGraph } from "@/data/seed-graph.ts";
import { saveNativeEvent, deleteNativeEvent, nativeEventInput } from "./native-event-service.ts";
import { isGraph } from "@/services/graph/core/graph-service.ts";
import { createBackupArchive, readBackupArchive } from "@/services/backup/backup-service.ts";
import { DEFAULT_USER_PREFERENCES } from "@/services/preferences/preferences-service.ts";
import { reconcileCalendarBatch, removeImportedEvents, replaceImportedEventSubgraph } from "../event-service.ts";
import { visibleCalendarEvents } from "@/utils/calendar/events/graph-calendar.ts";
import type { NativeEventInput } from "@/types/calendar/events/event.ts";
import type { CalendarSyncBatch } from "@/types/calendar/events/external-calendar.ts";

const day = "2026-09-13";
const input: NativeEventInput = {
  name: " Planning ", description: "Notes", location: "Office", timeZone: "Europe/Vienna",
  startDate: day, endDate: day, startTime: "09:00", endTime: "10:00",
};
const batch: CalendarSyncBatch = {
  connectionId: crypto.randomUUID(), source: "google",
  calendar: { id: "work", name: "Work", color: "#4285f4" },
  authoritative: true, changes: [],
  state: { calendarId: "work", cursor: "cursor", rangeStart: day, rangeEnd: "2027-09-13",
    refreshAfter: "2026-10-01", timeZone: input.timeZone, syncedAt: new Date() },
};
batch.changes.push({ action: "upsert", event: {
  id: "remote", connectionId: batch.connectionId, calendarId: "work", calendarName: "Work",
  title: "Imported", color: "#4285f4", allDay: false,
  start: "2026-09-13T08:00:00Z", end: "2026-09-13T09:00:00Z",
} });

test("native events create, update, back up, and delete without damaging shared dates", () => {
  const base = createSeedGraph(day);
  const id = crypto.randomUUID();
  const created = saveNativeEvent(base, id, input, true);
  assert.equal(isGraph(created), true);
  const event = created.nodes.find((node) => node.id === id && node.type === "event")!;
  assert.equal(event.type === "event" && event.properties.name, "Planning");
  assert.equal(event.type === "event" && event.properties.externalOrigin, undefined);
  assert.equal(isGraph(BSON.deserialize(BSON.serialize(created, { ignoreUndefined: true }))), true);
  const editedInput = { ...input, name: "Later", startTime: "22:00", endTime: "02:00", endDate: "2026-09-14" };
  const edited = saveNativeEvent(created, id, editedInput, false);
  const editedEvent = edited.nodes.find((node) => node.id === id && node.type === "event")!;
  assert.ok(editedEvent.type === "event");
  assert.equal(isGraph(edited), true);
  assert.deepEqual(nativeEventInput(edited, editedEvent), editedInput);
  const restored = readBackupArchive(createBackupArchive(edited, DEFAULT_USER_PREFERENCES));
  assert.deepEqual(restored.graph, JSON.parse(JSON.stringify(edited)));
  assert.deepEqual(deleteNativeEvent(edited, id), base);
});

test("native all-day events use inclusive dates and omit times", () => {
  const id = crypto.randomUUID();
  const sameDay = { ...input, name: "Planning", allDay: true };
  let graph = saveNativeEvent(createSeedGraph(day), id, sameDay, true);
  let event = graph.nodes.find((node) => node.id === id)!;
  assert.ok(event.type === "event");
  assert.equal(event.properties.startTime, undefined);
  assert.equal(event.properties.endTime, undefined);
  assert.deepEqual(nativeEventInput(graph, event), sameDay);

  graph = saveNativeEvent(graph, id, { ...sameDay, endDate: "2026-09-14" }, false);
  event = graph.nodes.find((node) => node.id === id)!;
  assert.ok(event.type === "event");
  assert.equal(isGraph(graph), true);
  assert.equal(nativeEventInput(graph, event).endDate, "2026-09-14");
  assert.throws(() => saveNativeEvent(graph, id, {
    ...sameDay, startDate: "2026-09-14", endDate: day,
  }, false), /on or after/);

  const timed = saveNativeEvent(graph, id, {
    ...nativeEventInput(graph, event), allDay: false,
  }, false);
  const timedEvent = timed.nodes.find((node) => node.id === id)!;
  assert.ok(timedEvent.type === "event");
  assert.equal(timedEvent.properties.allDay, false);
  assert.equal(timedEvent.properties.startTime, "09:00");
});

test("native validation rejects bad input and imported edits, but allows longer overlaps", () => {
  const base = createSeedGraph(day);
  const id = crypto.randomUUID();
  const created = saveNativeEvent(base, id, input, true);
  for (const changes of [{ name: " " }, { startDate: "2026-02-30" }, { endTime: "09:00" },
    { endTime: "08:00" }, { startTime: "25:00" }, { timeZone: "Invalid/Zone" }]) {
    assert.throws(() => saveNativeEvent(created, id, { ...input, ...changes }, false));
  }
  assert.throws(() => saveNativeEvent(created, id, input, true));
  assert.throws(() => saveNativeEvent(base, id, input, false));
  const overlapping = saveNativeEvent(created, crypto.randomUUID(), { ...input, endTime: "12:00" }, true);
  assert.equal(isGraph(overlapping), true);
  assert.equal(visibleCalendarEvents(overlapping).length, 2);
  const invalid = { ...created, nodes: created.nodes.map((node) => node.id === id && node.type === "event"
    ? { ...node, properties: { ...node.properties, endTime: "08:00" } } : node) };
  assert.equal(isGraph(invalid), false);
  const imported = reconcileCalendarBatch(created, batch, input.timeZone);
  const remote = imported.nodes.find((node) => node.type === "event" && node.properties.externalOrigin)!;
  assert.throws(() => saveNativeEvent(imported, remote.id, input, false));
  assert.deepEqual(deleteNativeEvent(imported, remote.id), imported);
});

test("import refresh, deletion, disconnection, and adoption preserve native edits", () => {
  const id = crypto.randomUUID();
  const local = saveNativeEvent(createSeedGraph(day), id, input, true);
  const remote = reconcileCalendarBatch(local, batch, input.timeZone);
  assert.deepEqual(removeImportedEvents(remote), local);
  assert.deepEqual(removeImportedEvents(remote, (event) =>
    event.properties.externalOrigin.connectionId === batch.connectionId), local);
  assert.deepEqual(reconcileCalendarBatch(remote, { ...batch, changes: [] }, input.timeZone), local);
  const edited = saveNativeEvent(local, id, { ...input, name: "Local edit", endTime: "11:00" }, false);
  const adopted = replaceImportedEventSubgraph(edited, remote);
  assert.equal(isGraph(adopted), true);
  assert.deepEqual(removeImportedEvents(adopted), edited);
  assert.equal(visibleCalendarEvents(adopted, [], false).length, 1);
  assert.equal(visibleCalendarEvents(adopted, [], true).length, 1);
});
