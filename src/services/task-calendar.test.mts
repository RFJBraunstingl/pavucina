import assert from "node:assert/strict";
import test from "node:test";

import {
  getDaySchedule,
  scheduleTaskForDay,
  scheduleTaskOnDay,
} from "./task-day-schedule-service.ts";
import {
  getTaskDate,
  getTaskTime,
  setTaskDates,
  setTaskTimes,
} from "./task-schedule-service.ts";
import { calendarItem, layoutCalendarItems } from "../utils/calendar.ts";
import { DAY_HEIGHT, droppedTimeRange } from "../utils/day-schedule.ts";
import type { Graph, TaskNode } from "../types/graph.ts";

const DAY = "2026-09-07";

function graphWithTasks(...tasks: TaskNode[]): Graph {
  return { version: 1, nodes: tasks, relationships: [] };
}

function scheduled(graph: Graph, taskId: string, start: string, end: string) {
  return setTaskTimes(setTaskDates(graph, taskId, DAY, DAY), taskId, start, end);
}

test("day scheduling uses the earliest fitting slot and falls back to 09:00", () => {
  const target = { id: "target", type: "task", properties: { name: "Target" } } as const;
  const short = {
    id: "short",
    type: "task",
    properties: {
      name: "Short",
      plannedStartTime: "13:00",
      plannedEndTime: "13:30",
    },
  } as const;
  const first = { id: "first", type: "task", properties: { name: "First" } } as const;
  const second = { id: "second", type: "task", properties: { name: "Second" } } as const;
  let graph = graphWithTasks(target, short, first, second);
  graph = setTaskDates(graph, first.id, DAY, DAY);
  graph = scheduled(graph, second.id, "11:00", "23:00");

  const placed = scheduleTaskOnDay(graph, target.id, DAY);
  assert.deepEqual(
    [
      getTaskDate(placed, target.id, "plannedStartDate"),
      getTaskDate(placed, target.id, "plannedEndDate"),
      getTaskTime(placed, target.id, "plannedStartTime"),
      getTaskTime(placed, target.id, "plannedEndTime"),
    ],
    [DAY, DAY, "10:00", "11:00"],
  );
  const shortPlaced = scheduleTaskOnDay(graph, short.id, DAY);
  assert.deepEqual(
    [
      getTaskTime(shortPlaced, short.id, "plannedStartTime"),
      getTaskTime(shortPlaced, short.id, "plannedEndTime"),
    ],
    ["10:00", "10:30"],
  );

  const fullDay = scheduled(graph, first.id, "09:00", "23:00");
  assert.equal(
    getTaskTime(
      scheduleTaskOnDay(fullDay, target.id, DAY),
      target.id,
      "plannedStartTime",
    ),
    "09:00",
  );
});

test("calendar layout gives overlapping events separate lanes", () => {
  const tasks = ["a", "b", "c", "d", "e"].map(
    (id): TaskNode => ({ id, type: "task", properties: { name: id } }),
  );
  const item = (task: TaskNode, start: string, end: string, date = DAY) =>
    calendarItem(task, date, date, start, end, DAY)!;
  const laidOut = layoutCalendarItems([
    item(tasks[0], "09:00", "10:00"),
    item(tasks[1], "09:30", "10:30"),
    item(tasks[2], "10:00", "11:00"),
    item(tasks[3], "11:00", "12:00"),
    item(tasks[4], "09:00", "10:00", "2026-09-08"),
  ]);

  assert.deepEqual(
    laidOut.map(({ laneIndex, laneCount }) => [laneIndex, laneCount]),
    [[0, 2], [1, 2], [0, 2], [0, 1], [0, 1]],
  );
});

test("daily scheduling separates ranged tasks and collapses scheduled dates", () => {
  const task = {
    id: "ranged",
    type: "task",
    properties: {
      name: "Ranged task",
      plannedStartTime: "13:00",
      plannedEndTime: "14:30",
    },
  } as const;
  let graph = setTaskDates(
    graphWithTasks(task),
    task.id,
    "2026-09-06",
    "2026-09-08",
  );

  assert.deepEqual(
    getDaySchedule(graph, DAY, "all", false).unscheduled.map(({ task }) => task.id),
    [task.id],
  );
  graph = scheduleTaskForDay(graph, task.id, DAY, "13:00", "14:30");
  assert.deepEqual(
    [
      getTaskDate(graph, task.id, "plannedStartDate"),
      getTaskDate(graph, task.id, "plannedEndDate"),
      getDaySchedule(graph, DAY, "all", false).events[0]?.task.id,
    ],
    [DAY, DAY, task.id],
  );
  assert.deepEqual(droppedTimeRange(DAY_HEIGHT, DAY_HEIGHT, 60), ["22:45", "23:45"]);
  assert.throws(() => scheduleTaskForDay(graph, task.id, DAY, "15:00", "14:00"));
});

test("daily scheduling honors task hierarchy and completed-task filtering", () => {
  const parent = {
    id: "parent",
    type: "task",
    properties: { name: "Parent", plannedStartTime: "09:00", plannedEndTime: "10:00" },
  } as const;
  const child = {
    id: "child",
    type: "task",
    properties: { name: "Child", plannedStartTime: "10:00", plannedEndTime: "11:00", done: true },
  } as const;
  let graph = graphWithTasks(parent, child);
  graph.relationships.push({ id: "child-edge", type: "child", sourceId: parent.id, targetId: child.id });
  graph = setTaskDates(graph, parent.id, DAY, DAY);
  graph = setTaskDates(graph, child.id, DAY, DAY);

  assert.deepEqual(
    getDaySchedule(graph, DAY, "leaf", false).events.map(({ task }) => task.id),
    [child.id],
  );
  assert.deepEqual(
    getDaySchedule(graph, DAY, "all", false).events.map(({ task }) => task.id),
    [parent.id, child.id],
  );
  assert.equal(getDaySchedule(graph, DAY, "leaf", true).events.length, 0);
});
