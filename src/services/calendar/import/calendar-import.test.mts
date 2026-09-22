import assert from "node:assert/strict";
import test from "node:test";
import { BSON } from "mongodb";

import { createSeedGraph } from "@/data/seed-graph.ts";
import {
  getEventDate,
  reconcileCalendarBatch,
  replaceImportedEventSubgraph,
} from "@/services/event/event-service.ts";
import { isGraph } from "@/services/graph/core/graph-service.ts";
import type {
  CalendarSyncBatch,
  ExternalCalendarEvent,
} from "@/types/calendar/events/external-calendar.ts";

const connectionId = "00000000-0000-4000-8000-000000000099";
const calendar = { id: "work", name: "Work", color: "#4285f4" };

function batch(
  changes: CalendarSyncBatch["changes"],
  authoritative = true,
): CalendarSyncBatch {
  return {
    connectionId,
    source: "google",
    calendar,
    changes,
    authoritative,
    state: {
      calendarId: calendar.id,
      cursor: "cursor",
      rangeStart: "2026-08-01",
      rangeEnd: "2027-10-01",
      refreshAfter: "2026-10-01",
      timeZone: "Europe/Vienna",
      syncedAt: new Date("2026-09-13T00:00:00Z"),
    },
  };
}

const meeting: ExternalCalendarEvent = {
  id: "meeting",
  connectionId,
  calendarId: calendar.id,
  calendarName: calendar.name,
  title: "Planning",
  description: "Quarterly planning",
  location: "Room 3",
  color: calendar.color,
  allDay: false,
  start: "2026-09-13T07:00:00.000Z",
  end: "2026-09-13T08:30:00.000Z",
  url: "https://calendar.google.com/event",
};

test("calendar events become stable first-class graph nodes", () => {
  const original = createSeedGraph("2026-09-13");
  const imported = reconcileCalendarBatch(
    original,
    batch([{ action: "upsert", event: meeting }]),
    "Europe/Vienna",
  );
  const event = imported.nodes.find((node) => node.type === "event")!;
  assert.equal(event.properties.name, "Planning");
  assert.equal(event.properties.startTime, "09:00");
  assert.equal(event.properties.endTime, "10:30");
  assert.equal(getEventDate(imported, event.id, "eventStartDate"), "2026-09-13");
  assert.equal(getEventDate(imported, event.id, "eventEndDate"), "2026-09-13");
  assert.equal(isGraph(imported), true);
  assert.equal(isGraph(BSON.deserialize(BSON.serialize(imported, { ignoreUndefined: true }))), true);

  const repeated = reconcileCalendarBatch(
    imported,
    batch([{ action: "upsert", event: meeting }], false),
    "Europe/Vienna",
  );
  assert.equal(repeated.nodes.find((node) => node.type === "event")?.id, event.id);
  assert.deepEqual(repeated, imported);
});

test("provider updates and deletions reconcile without touching tasks", () => {
  const original = createSeedGraph("2026-09-13");
  const imported = reconcileCalendarBatch(
    original,
    batch([{ action: "upsert", event: meeting }]),
    "Europe/Vienna",
  );
  const eventId = imported.nodes.find((node) => node.type === "event")!.id;
  const updated = reconcileCalendarBatch(imported, batch([{
    action: "upsert",
    event: {
      ...meeting,
      location: "Room 5",
      start: "2026-09-14T08:00:00.000Z",
      end: "2026-09-14T09:00:00.000Z",
    },
  }], false), "Europe/Vienna");
  const event = updated.nodes.find((node) => node.type === "event")!;
  assert.equal(event.id, eventId);
  assert.equal(event.properties.location, "Room 5");
  assert.equal(getEventDate(updated, event.id, "eventStartDate"), "2026-09-14");
  const recolored = reconcileCalendarBatch(updated, {
    ...batch([], false),
    calendar: { ...calendar, color: "#ff0000" },
  }, "Europe/Vienna");
  assert.equal(
    recolored.nodes.find((node) => node.type === "event")?.properties.calendarColor,
    "#ff0000",
  );

  const deleted = reconcileCalendarBatch(
    recolored,
    batch([{ action: "delete", eventId: meeting.id }], false),
    "Europe/Vienna",
  );
  assert.equal(deleted.nodes.some((node) => node.type === "event"), false);
  assert.equal(
    deleted.nodes.filter((node) => node.type === "task").length,
    original.nodes.filter((node) => node.type === "task").length,
  );
});

test("all-day provider end dates become inclusive event date edges", () => {
  const graph = reconcileCalendarBatch(createSeedGraph("2026-09-13"), batch([{
    action: "upsert",
    event: {
      ...meeting,
      id: "conference",
      title: "Conference",
      allDay: true,
      start: "2026-09-20",
      end: "2026-09-23",
    },
  }]), "Europe/Vienna");
  const event = graph.nodes.find((node) => node.type === "event")!;
  assert.equal(event.properties.startTime, undefined);
  assert.equal(getEventDate(graph, event.id, "eventStartDate"), "2026-09-20");
  assert.equal(getEventDate(graph, event.id, "eventEndDate"), "2026-09-22");
  assert.equal(isGraph(BSON.deserialize(BSON.serialize(graph, { ignoreUndefined: true }))), true);
  assert.equal(isGraph(BSON.deserialize(BSON.serialize(graph, { ignoreUndefined: false }))), false);
});

test("event validation requires both date edges and unique origins", () => {
  const imported = reconcileCalendarBatch(
    createSeedGraph("2026-09-13"),
    batch([{ action: "upsert", event: meeting }]),
    "Europe/Vienna",
  );
  assert.equal(isGraph({
    ...imported,
    relationships: imported.relationships.filter(({ type }) => type !== "eventEndDate"),
  }), false);
  const event = imported.nodes.find((node) => node.type === "event")!;
  assert.equal(isGraph({ ...imported, nodes: [...imported.nodes, {
    ...event,
    id: crypto.randomUUID(),
  }] }), false);
});

test("remote event adoption preserves newer local task edits", () => {
  const local = createSeedGraph("2026-09-13");
  const remote = reconcileCalendarBatch(
    local,
    batch([{ action: "upsert", event: meeting }]),
    "Europe/Vienna",
  );
  const firstTask = local.nodes.find((node) => node.type === "task")!;
  const edited = {
    ...local,
    nodes: local.nodes.map((node) => node.id === firstTask.id && node.type === "task"
      ? { ...node, properties: { ...node.properties, name: "Locally edited" } }
      : node),
  };
  const merged = replaceImportedEventSubgraph(edited, remote);
  const mergedTask = merged.nodes.find((node) => node.id === firstTask.id);
  assert.equal(
    mergedTask?.type === "task" ? mergedTask.properties.name : undefined,
    "Locally edited",
  );
  assert.equal(merged.nodes.some((node) => node.type === "event"), true);
  assert.equal(isGraph(merged), true);
});
