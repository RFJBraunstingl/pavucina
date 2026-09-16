import assert from "node:assert/strict";
import test from "node:test";

import { getDaySchedule, scheduleTaskOnDay } from "./task-day-schedule-service.ts";
import { getTaskDate, getTaskTime, setTaskDates, setTaskTimes } from "./task-schedule-service.ts";
import type { EventNode } from "../types/event.ts";
import type { Graph, TaskNode } from "../types/graph.ts";

const DAY = "2026-09-07";
const target: TaskNode = { id: "target", type: "task", properties: { name: "Target" } };

function graphWithTasks(...tasks: TaskNode[]): Graph {
  return { version: 1, nodes: tasks, relationships: [] };
}

function scheduled(graph: Graph, taskId: string, start: string, end: string) {
  return setTaskTimes(setTaskDates(graph, taskId, DAY, DAY), taskId, start, end);
}

function withEvent(
  graph: Graph,
  id: string,
  startDate: string,
  endDate: string,
  startTime?: string,
  endTime?: string,
  imported = false,
): Graph {
  const event: EventNode = {
    id,
    type: "event",
    properties: {
      name: id,
      startTime,
      endTime,
      allDay: !startTime,
      timeZone: "Europe/Vienna",
      calendarName: "Work",
      calendarColor: "#4285f4",
      ...(imported ? { externalOrigin: {
        kind: "calendar" as const,
        source: "google" as const,
        connectionId: "hidden-account",
        calendarId: "hidden-calendar",
        eventId: id,
      } } : {}),
    },
  };
  const startId = `${id}-start-date`;
  const endId = `${id}-end-date`;
  return {
    ...graph,
    nodes: [
      ...graph.nodes,
      event,
      { id: startId, type: "date", properties: { value: startDate } },
      { id: endId, type: "date", properties: { value: endDate } },
    ],
    relationships: [
      ...graph.relationships,
      { id: `${id}-start-edge`, type: "eventStartDate", sourceId: id, targetId: startId },
      { id: `${id}-end-edge`, type: "eventEndDate", sourceId: id, targetId: endId },
    ],
  };
}

function times(graph: Graph, taskId = target.id) {
  return [
    getTaskTime(graph, taskId, "plannedStartTime"),
    getTaskTime(graph, taskId, "plannedEndTime"),
  ];
}

test("automatic scheduling retains the earliest full gap between tasks", () => {
  const first: TaskNode = { id: "first", type: "task", properties: { name: "First" } };
  const second: TaskNode = { id: "second", type: "task", properties: { name: "Second" } };
  const short: TaskNode = { id: "short", type: "task", properties: {
    name: "Short", plannedStartTime: "13:00", plannedEndTime: "13:30",
  } };
  let graph = graphWithTasks(target, first, second, short);
  graph = setTaskDates(graph, first.id, DAY, DAY);
  graph = scheduled(graph, second.id, "11:00", "23:00");

  assert.deepEqual(times(scheduleTaskOnDay(graph, target.id, DAY)), ["10:00", "11:00"]);
  assert.deepEqual(times(scheduleTaskOnDay(graph, short.id, DAY), short.id),
    ["10:00", "10:30"]);
});

test("imported hidden-calendar and native timed events both block default times", () => {
  let graph = withEvent(graphWithTasks(target), "imported", DAY, DAY,
    "09:00", "10:30", true);
  graph = withEvent(graph, "native", DAY, DAY, "11:30", "12:30");
  assert.deepEqual(times(scheduleTaskOnDay(graph, target.id, DAY)), ["10:30", "11:30"]);

  const task: TaskNode = { id: "busy-task", type: "task", properties: { name: "Busy" } };
  const combined = scheduled({ ...graph, nodes: [...graph.nodes, task] }, task.id,
    "10:45", "11:15");
  assert.deepEqual(times(scheduleTaskOnDay(combined, target.id, DAY)), ["12:30", "13:30"]);
});

test("overnight events block the following morning; all-day events do not", () => {
  let graph = withEvent(graphWithTasks(target), "overnight", "2026-09-06", DAY,
    "23:00", "09:30", true);
  graph = withEvent(graph, "all-day", DAY, DAY);
  assert.deepEqual(times(scheduleTaskOnDay(graph, target.id, DAY)), ["09:30", "10:30"]);
  assert.deepEqual(times(scheduleTaskOnDay(withEvent(graphWithTasks(target), "all-day", DAY,
    DAY), target.id, DAY)), ["09:00", "10:00"]);
});

test("an event continuing past midnight blocks the late-day gap", () => {
  const shortTarget: TaskNode = { ...target, properties: {
    ...target.properties, plannedStartTime: "13:00", plannedEndTime: "13:30",
  } };
  const busy: TaskNode = { id: "busy", type: "task", properties: { name: "Busy" } };
  let graph = scheduled(graphWithTasks(shortTarget, busy), busy.id, "09:00", "22:45");
  graph = withEvent(graph, "late", DAY, "2026-09-08", "23:00", "01:00", true);
  assert.deepEqual(times(scheduleTaskOnDay(graph, target.id, DAY)),
    [undefined, undefined]);
});

test("a full day keeps the chosen date and clears stale times", () => {
  const timedTarget: TaskNode = { ...target, properties: {
    ...target.properties, plannedStartTime: "13:00", plannedEndTime: "14:00",
  } };
  let graph = setTaskDates(graphWithTasks(timedTarget), target.id,
    "2026-09-06", "2026-09-06");
  graph = withEvent(graph, "day-long", DAY, "2026-09-08",
    "09:00", "00:00", true);
  const placed = scheduleTaskOnDay(graph, target.id, DAY);

  assert.deepEqual([
    getTaskDate(placed, target.id, "plannedStartDate"),
    getTaskDate(placed, target.id, "plannedEndDate"),
    ...times(placed),
  ], [DAY, DAY, undefined, undefined]);
  assert.deepEqual(getDaySchedule(placed, DAY, "all", false).unscheduled.map(({ task }) => task.id),
    [target.id]);

  const busy: TaskNode = { id: "busy", type: "task", properties: { name: "Busy" } };
  const taskBlocked = scheduled(graphWithTasks(target, busy), busy.id,
    "09:00", "23:59");
  assert.deepEqual(times(scheduleTaskOnDay(taskBlocked, target.id, DAY)),
    [undefined, undefined]);
});
