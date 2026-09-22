import assert from "node:assert/strict";
import test from "node:test";

import {
  getDaySchedule,
  getOverdueTasks,
} from "./task-day-view-service.ts";
import {
  scheduleTaskForDay,
} from "./task-day-schedule-service.ts";
import {
  getTaskDate,
} from "../dates/task-date-service.ts";
import { setTaskDates } from "../dates/task-date-range-service.ts";
import { markNodeDone } from "@/services/event/completion-service.ts";
import { calendarItem, HOUR_HEIGHT } from "@/utils/calendar/calendar.ts";
import { layoutCalendarItems } from "@/utils/calendar/calendar-layout.ts";
import { DAY_HEIGHT, droppedTimeRange } from "@/utils/calendar/day-schedule.ts";
import type { Graph, TaskNode } from "@/types/graph/graph.ts";

const DAY = "2026-09-07";

function graphWithTasks(...tasks: TaskNode[]): Graph {
  return { version: 1, nodes: tasks, relationships: [] };
}

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
  assert.deepEqual(
    [
      item(tasks[0], "00:00", "01:00").top,
      item(tasks[0], "23:30", "23:59").height,
    ],
    [0, (29 / 60) * HOUR_HEIGHT],
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

test("daily scheduling finds overdue incomplete tasks", () => {
  const parent = {
    id: "overdue-parent",
    type: "task",
    properties: { name: "Older parent" },
  } as const;
  const child = {
    id: "overdue-child",
    type: "task",
    properties: { name: "Recent child" },
  } as const;
  const dueToday = {
    id: "due-today",
    type: "task",
    properties: { name: "Due today" },
  } as const;
  const done = {
    id: "done-overdue",
    type: "task",
    properties: { name: "Finished" },
  } as const;
  let graph = graphWithTasks(parent, child, dueToday, done);
  graph.relationships.push({
    id: "overdue-child-edge",
    type: "child",
    sourceId: parent.id,
    targetId: child.id,
  });
  for (const [taskId, date] of [
    [parent.id, "2026-09-04"],
    [child.id, "2026-09-06"],
    [dueToday.id, DAY],
    [done.id, "2026-09-03"],
  ]) {
    graph = setTaskDates(graph, taskId, date, date);
  }
  graph = markNodeDone(graph, done.id, DAY);

  assert.deepEqual(
    getOverdueTasks(graph, DAY, "all").map(({ task }) => task.id),
    [parent.id, child.id],
  );
  assert.deepEqual(
    getOverdueTasks(graph, DAY, "leaf").map(({ task }) => task.id),
    [child.id],
  );
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
    properties: { name: "Child", plannedStartTime: "10:00", plannedEndTime: "11:00" },
  } as const;
  let graph = graphWithTasks(parent, child);
  graph.relationships.push({ id: "child-edge", type: "child", sourceId: parent.id, targetId: child.id });
  graph = setTaskDates(graph, parent.id, DAY, DAY);
  graph = setTaskDates(graph, child.id, DAY, DAY);
  graph = markNodeDone(graph, child.id, DAY);

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
