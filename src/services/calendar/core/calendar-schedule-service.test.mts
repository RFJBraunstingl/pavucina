import assert from "node:assert/strict";
import test from "node:test";
import { createSeedGraph } from "@/data/seed-graph.ts";
import { isGraph } from "@/services/graph/core/graph-service.ts";
import { nativeEventInput, saveNativeEvent } from "@/services/event/native/native-event-service.ts";
import { getDaySchedule, scheduleTaskForDay } from "@/services/task/scheduling/day/task-day-schedule-service.ts";
import { getTaskDate } from "@/services/task/scheduling/task-date-service.ts";
import { getTaskTime } from "@/services/task/scheduling/task-time-service.ts";
import { calendarResizeEdges, canRescheduleCalendarItem, moveCalendarItem, resizeCalendarItem } from "./calendar-schedule-service.ts";
import { importedCalendarItems } from "@/utils/calendar/event-calendar.ts";
import { makeDateRange } from "@/utils/shared/date.ts";
import type { Graph } from "@/types/graph/graph.ts";

const day = "2026-09-13";
const id = crypto.randomUUID();
const details = { name: "Planning", description: "Keep these notes", location: "Office", timeZone: "Europe/Vienna" };
function scheduled(startTime = "09:00", endTime = "10:00", endDate = day) {
  return saveNativeEvent(createSeedGraph(day), id, {
    ...details, startDate: day, endDate, startTime, endTime,
  }, true);
}
function items(graph: Graph) {
  return importedCalendarItems(graph, graph.nodes.filter((node) => node.type === "event"), makeDateRange(day));
}
function range(graph: Graph) {
  const node = graph.nodes.find((node) => node.id === id);
  assert.ok(node?.type === "event");
  assert.equal(isGraph(graph), true);
  return nativeEventInput(graph, node);
}

test("moving native blocks preserves duration, details, tasks, and original graph", () => {
  const graph = scheduled();
  const original = structuredClone(graph);
  const moved = moveCalendarItem(graph, items(graph)[0], "2026-09-14", "23:30");
  assert.deepEqual(range(moved), { ...details, startDate: "2026-09-14", endDate: "2026-09-15", startTime: "23:30", endTime: "00:30" });
  assert.deepEqual(graph, original);
  assert.deepEqual(moved.nodes.filter((node) => node.type === "task"), graph.nodes.filter((node) => node.type === "task"));
  assert.equal(moveCalendarItem(graph, items(graph)[0], day, "09:00"), graph);
});

test("dragging a continuation moves the entire multi-day event", () => {
  const graph = scheduled("22:00", "02:00", "2026-09-15");
  const segments = items(graph);
  assert.equal(segments.length, 3);
  assert.deepEqual(segments.map((item) => calendarResizeEdges(graph, item)), [
    { resizeStart: true, resizeEnd: false },
    { resizeStart: false, resizeEnd: false },
    { resizeStart: false, resizeEnd: true },
  ]);
  const moved = moveCalendarItem(graph, segments[1], "2026-09-15", "01:00");
  assert.deepEqual(range(moved), { ...details, startDate: "2026-09-14", endDate: "2026-09-16", startTime: "23:00", endTime: "03:00" });
  assert.equal(resizeCalendarItem(graph, segments[1], "start", 15), graph);
  assert.equal(resizeCalendarItem(graph, segments[1], "end", 15), graph);
});

test("edge resizing changes only the actual boundary, clamps duration, and crosses midnight", () => {
  const graph = scheduled();
  const item = items(graph)[0];
  assert.deepEqual(range(resizeCalendarItem(graph, item, "start", -15)), {
    ...details, startDate: day, endDate: day, startTime: "08:45", endTime: "10:00",
  });
  assert.equal(range(resizeCalendarItem(graph, item, "start", 300)).startTime, "09:45");
  assert.equal(range(resizeCalendarItem(graph, item, "end", -300)).endTime, "09:15");
  const midnight = scheduled("23:00", "00:00", "2026-09-14");
  assert.deepEqual(calendarResizeEdges(midnight, items(midnight)[0]), { resizeStart: true, resizeEnd: true });
  assert.deepEqual(range(resizeCalendarItem(midnight, items(midnight)[0], "end", 30)), {
    ...details, startDate: day, endDate: "2026-09-14", startTime: "23:00", endTime: "00:30",
  });
  const early = scheduled("00:15", "01:00");
  assert.deepEqual(range(resizeCalendarItem(early, items(early)[0], "start", -30)), {
    ...details, startDate: "2026-09-12", endDate: day, startTime: "23:45", endTime: "01:00",
  });
});

test("imported, deleted, and all-day events cannot be rescheduled", () => {
  const graph = scheduled();
  const item = items(graph)[0];
  assert.equal(canRescheduleCalendarItem(graph, item, "leaf"), true);
  const imported: Graph = { ...graph, nodes: graph.nodes.map((node) => node.id === id && node.type === "event"
    ? { ...node, properties: { ...node.properties, externalOrigin: {
      kind: "calendar", source: "google", connectionId: crypto.randomUUID(), calendarId: "work", eventId: "remote",
    } } } : node) };
  const allDay: Graph = { ...graph, nodes: graph.nodes.map((node) => node.id === id && node.type === "event"
    ? { ...node, properties: { ...node.properties, allDay: true, startTime: undefined, endTime: undefined } } : node) };
  for (const current of [imported, allDay, createSeedGraph(day)]) {
    assert.equal(canRescheduleCalendarItem(current, item, "leaf"), false);
    assert.equal(moveCalendarItem(current, item, day, "11:00"), current);
    assert.equal(resizeCalendarItem(current, item, "end", 15), current);
  }
});

test("task moves and edge adjustments still use task schedule rules", () => {
  const graph = createSeedGraph(day);
  // The seed's leaf tasks span dates; give one a concrete single-day slot.
  const task = graph.nodes.find((node) => node.type === "task" && node.properties.name === "Timeline interactions")!;
  const scheduled = scheduleTaskForDay(graph, task.id, day, "09:00", "10:00");
  const item = getDaySchedule(scheduled, day, "leaf", false).events[0];
  assert.equal(canRescheduleCalendarItem(scheduled, item, "leaf"), true);
  const moved = moveCalendarItem(scheduled, item, "2026-09-14", "11:30");
  assert.equal(getTaskDate(moved, task.id, "plannedStartDate"), "2026-09-14");
  assert.equal(getTaskTime(moved, task.id, "plannedStartTime"), "11:30");
  assert.equal(getTaskTime(moved, task.id, "plannedEndTime"), "12:30");
  const resized = resizeCalendarItem(scheduled, item, "end", 15);
  assert.equal(getTaskTime(resized, task.id, "plannedEndTime"), "10:15");
});
