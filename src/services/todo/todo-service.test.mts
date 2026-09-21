import assert from "node:assert/strict";
import test from "node:test";

import { createSeedGraph } from "@/data/seed-graph.ts";
import { reconcileCalendarBatch } from "@/services/event/event-service.ts";
import { saveNativeEvent } from "@/services/event/native/native-event-service.ts";
import { getLeafTasksForDate, setTaskTime } from "@/services/task/core/task-service.ts";
import { isNodeDone, markNodeDone, reopenNode } from "@/services/event/completion-service.ts";
import { getTodoItemsForDate, getTodoSchedule } from "./todo-service.ts";
import { visibleImportedEvents } from "@/utils/calendar/event-calendar.ts";
import type { CalendarConnectionSummary, ExternalCalendarEvent } from "@/types/calendar/external-calendar.ts";
import type { Graph } from "@/types/graph/graph.ts";

const today = "2026-09-13";
const connectionId = "00000000-0000-4000-8000-000000000099";
const connections: CalendarConnectionSummary[] = [{
  id: connectionId, source: "google", address: "test@example.com", status: "connected",
  calendars: [
    { id: "work", name: "Work", color: "#4285f4", selected: true, visible: true },
    { id: "hidden", name: "Hidden", color: "#4285f4", selected: true, visible: false },
    { id: "unselected", name: "Unselected", color: "#4285f4", selected: false, visible: true },
  ],
}];

function addEvent(
  graph: Graph, title: string, start: string, end: string,
  overrides: Partial<ExternalCalendarEvent> = {},
) {
  const event: ExternalCalendarEvent = {
    id: title, title, connectionId, calendarId: "work", calendarName: "Work",
    color: "#4285f4", allDay: false, start, end, ...overrides,
  };
  return reconcileCalendarBatch(graph, {
    connectionId: event.connectionId, source: "google",
    calendar: { id: event.calendarId, name: event.calendarName, color: event.color },
    authoritative: false, changes: [{ action: "upsert", event }],
    state: {
      calendarId: event.calendarId, cursor: "cursor", timeZone: "Europe/Vienna",
      rangeStart: "2026-08-01", rangeEnd: "2027-10-01",
      refreshAfter: "2026-10-01", syncedAt: new Date(`${today}T00:00:00Z`),
    },
  }, "Europe/Vienna");
}

test("ToDo merges events with leaf tasks, sorting all-day first and untimed last", () => {
  let graph = createSeedGraph(today);
  const design = getLeafTasksForDate(graph, today).find(({ properties }) =>
    properties.name === "Design timeline")!;
  graph = setTaskTime(graph, design.id, "plannedStartTime", "");
  graph = addEvent(graph, "Morning", `${today}T07:00:00Z`, `${today}T08:00:00Z`);
  graph = addEvent(graph, "A meeting", `${today}T09:00:00Z`, `${today}T10:00:00Z`);
  graph = addEvent(graph, "Z meeting", `${today}T09:00:00Z`, `${today}T10:00:00Z`);
  graph = addEvent(graph, "All day", today, "2026-09-14", { allDay: true });
  graph = addEvent(graph, "Overnight", "2026-09-12T20:00:00Z", `${today}T06:00:00Z`);
  const original = structuredClone(graph);
  const items = getTodoItemsForDate(graph, today, connections);
  assert.deepEqual(items.map(({ properties }) => properties.name), [
    "All day", "Overnight", "Morning", "A meeting", "Timeline interactions",
    "Z meeting", "Design timeline",
  ]);
  assert.deepEqual(items.filter(({ type }) => type === "task"), getLeafTasksForDate(graph, today));
  assert.deepEqual(graph, original);
  assert.deepEqual(getTodoSchedule(graph, items[2]), {
    startDate: today, endDate: today, startTime: "09:00", endTime: "10:00", allDay: false,
  });
});

test("visibility requires selection and matches both account and calendar", () => {
  let graph = createSeedGraph(today);
  for (const calendarId of ["work", "hidden", "unselected"]) {
    graph = addEvent(graph, calendarId, `${today}T07:00:00Z`, `${today}T08:00:00Z`, { calendarId });
  }
  graph = addEvent(graph, "Other account", `${today}T07:00:00Z`, `${today}T08:00:00Z`, {
    connectionId: "00000000-0000-4000-8000-000000000098",
  });
  assert.deepEqual(visibleImportedEvents(graph, connections).map(({ properties }) => properties.name), ["work"]);
  assert.deepEqual(getTodoItemsForDate(graph, today), getLeafTasksForDate(graph, today));
  const hidden = structuredClone(connections);
  hidden[0].calendars[0].visible = false;
  assert.deepEqual(getTodoItemsForDate(graph, today, hidden), getLeafTasksForDate(graph, today));
  const failedProvider = connections.map((connection) => ({ ...connection, status: "error" as const }));
  assert.equal(visibleImportedEvents(graph, failedProvider).length, 1);
  assert.deepEqual(visibleImportedEvents(null, connections), []);
});

test("event days use inclusive all-day dates and exclude timed midnight endings", () => {
  let graph: Graph = { version: 1, nodes: [], relationships: [] };
  graph = addEvent(graph, "All day", "2026-09-12", "2026-09-15", { allDay: true });
  graph = addEvent(graph, "Overnight", "2026-09-12T20:00:00Z", `${today}T06:00:00Z`);
  graph = addEvent(graph, "Ends midnight", "2026-09-12T20:00:00Z", "2026-09-12T22:00:00Z");
  graph = addEvent(graph, "Starts midnight", "2026-09-12T22:00:00Z", `${today}T00:00:00Z`);
  graph = addEvent(graph, "Multi-day", "2026-09-12T20:00:00Z", "2026-09-14T06:00:00Z");
  assert.deepEqual(getTodoItemsForDate(graph, today, connections).map(({ properties }) => properties.name), [
    "All day", "Multi-day", "Overnight", "Starts midnight",
  ]);
  assert.deepEqual(getTodoItemsForDate(graph, "2026-09-14", connections).map(({ properties }) => properties.name), [
    "All day", "Multi-day",
  ]);
  assert.deepEqual(getTodoItemsForDate(graph, "2026-09-15", connections), []);
  assert.deepEqual(getTodoItemsForDate(graph, "2026-09-11", connections), []);
  const incomplete = { ...graph, relationships: graph.relationships.filter(({ type }) => type !== "eventEndDate") };
  assert.deepEqual(getTodoItemsForDate(incomplete, today, connections), []);
});

test("task completion and imported event updates preserve the mixed list", () => {
  let graph = addEvent(createSeedGraph(today), "Meeting", `${today}T07:00:00Z`, `${today}T08:00:00Z`);
  const taskId = getLeafTasksForDate(graph, today)[0].id;
  graph = markNodeDone(graph, taskId, today);
  const tasks = getTodoItemsForDate(graph, today, connections).filter(({ type }) => type === "task");
  assert.equal(tasks.length, 2);
  assert.equal(tasks.filter(({ id }) => isNodeDone(graph, id)).length, 1);
  const eventId = visibleImportedEvents(graph, connections)[0].id;
  graph = addEvent(reopenNode(graph, taskId, today), "Meeting", "2026-09-14T07:00:00Z", "2026-09-14T08:00:00Z");
  assert.equal(isNodeDone(graph, taskId), false);
  assert.equal(visibleImportedEvents(graph, connections)[0].id, eventId);
  assert.deepEqual(getTodoItemsForDate(graph, today, connections), getLeafTasksForDate(graph, today));
});

test("native events appear without connected calendars or calendar import", () => {
  const id = crypto.randomUUID();
  const graph = saveNativeEvent(createSeedGraph(today), id, {
    name: "Local meeting", description: "Plan the week", location: "Home",
    startDate: today, endDate: today, startTime: "09:00", endTime: "10:00",
    timeZone: "Europe/Vienna",
  }, true);
  const items = getTodoItemsForDate(graph, today);
  assert.equal(items[0].id, id);
  assert.equal(items[0].type, "event");
  assert.equal(items.filter(({ type }) => type === "task").length, 2);
  assert.equal(getTodoItemsForDate(graph, "2026-09-14").some((item) => item.id === id), false);
  assert.deepEqual(visibleImportedEvents(graph, connections), []);
});
