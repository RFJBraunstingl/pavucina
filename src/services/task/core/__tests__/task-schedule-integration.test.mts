import assert from "node:assert/strict";
import test from "node:test";

import {
  addChildTask,
  flattenTasks,
  getLeafTasksForDate,
} from "../task-service.ts";
import {
  getTaskDate,
  moveTask,
  resizeTask,
  setTaskDate,
  setTaskDates,
} from "../../scheduling/task-date-service.ts";
import {
  getTaskTime,
  moveScheduledTask,
  setTaskTimes,
} from "../../scheduling/task-time-service.ts";
import { isGraph, isUuid } from "@/services/graph/core/graph-service.ts";
import { createSeedGraph } from "@/data/seed-graph.ts";
import { calendarItem, HOUR_HEIGHT, resizeTimeRange } from "@/utils/calendar/calendar.ts";
import { addDays, makeDateRange } from "@/utils/shared/temporal/date.ts";
import type { TaskNode } from "@/types/graph/graph.ts";

test("task graph operations preserve relationships and schedules", () => {
  let graph = createSeedGraph("2026-03-29");
  const taskId = (name: string) => {
    const task = graph.nodes.find(
      (node): node is TaskNode =>
        node.type === "task" && node.properties.name === name,
    );
    assert.ok(task);
    return task.id;
  };
  const projectId = taskId("Launch Pavucina");
  assert.equal(makeDateRange("2026-03-29").at(-1), "2026-04-25");
  assert.equal(addDays("2026-03-29", 1), "2026-03-30");
  assert.equal(flattenTasks(graph)[1].depth, 1);
  assert.deepEqual(
    getLeafTasksForDate(graph, "2026-03-29").map(
      (task) => task.properties.name,
    ),
    ["Timeline interactions", "Design timeline"],
  );
  assert.equal(
    [...graph.nodes, ...graph.relationships].every((item) => isUuid(item.id)),
    true,
  );
  const childId = crypto.randomUUID();
  graph = addChildTask(graph, projectId, childId);
  assert.deepEqual(
    [
      getTaskDate(graph, childId, "plannedStartDate"),
      getTaskDate(graph, childId, "plannedEndDate"),
    ],
    [undefined, undefined],
  );

  graph = setTaskDates(graph, childId, "2026-03-20", "2026-04-10");
  graph = moveTask(graph, childId, 2);
  assert.equal(getTaskDate(graph, childId, "plannedStartDate"), "2026-03-22");
  assert.equal(getTaskDate(graph, childId, "plannedEndDate"), "2026-04-12");

  graph = resizeTask(graph, childId, "start", 99);
  assert.equal(
    getTaskDate(graph, childId, "plannedStartDate"),
    getTaskDate(graph, childId, "plannedEndDate"),
  );

  graph = setTaskDate(graph, childId, "plannedStartDate", "2026-04-01");
  const sharedDates = graph.nodes.filter(
    (node) => node.type === "date" && node.properties.value === "2026-04-01",
  );
  assert.equal(sharedDates.length, 1);
  assert.equal(isGraph(graph), true);

  graph = setTaskTimes(
    setTaskDates(graph, projectId, "2026-03-20", "2026-04-10"),
    projectId,
    "08:30",
    "09:30",
  );
  graph = moveScheduledTask(graph, projectId, "2026-04-06", "11:00");
  assert.equal(getTaskDate(graph, projectId, "plannedStartDate"), "2026-04-06");
  assert.equal(getTaskDate(graph, projectId, "plannedEndDate"), "2026-04-27");
  assert.equal(getTaskTime(graph, projectId, "plannedStartTime"), "11:00");
  assert.equal(getTaskTime(graph, projectId, "plannedEndTime"), "12:00");
  const project = graph.nodes.find(
    (node): node is TaskNode => node.id === projectId && node.type === "task",
  );
  assert.ok(project);
  assert.equal(
    calendarItem(project, "2026-04-06", "2026-04-27", "11:00", "12:00", "2026-04-06")
      ?.top,
    11 * HOUR_HEIGHT,
  );
  assert.equal(
    calendarItem(project, "2026-04-06", "2026-04-27", "11:00", "13:00", "2026-04-06")
      ?.height,
    2 * HOUR_HEIGHT,
  );
  assert.deepEqual(
    [
      resizeTimeRange("11:00", "12:00", "start", 15),
      resizeTimeRange("11:00", "12:00", "start", 90),
      resizeTimeRange("11:00", "12:00", "end", -90),
      resizeTimeRange("05:00", "06:00", "start", -15),
      resizeTimeRange("22:00", "23:00", "end", 15),
    ],
    [
      ["11:15", "12:00"],
      ["11:45", "12:00"],
      ["11:00", "11:15"],
      ["04:45", "06:00"],
      ["22:00", "23:15"],
    ],
  );

  const cyclic = structuredClone(graph);
  cyclic.relationships.push({
    id: crypto.randomUUID(),
    type: "child",
    sourceId: childId,
    targetId: projectId,
  });
  assert.equal(isGraph(cyclic), false);
});
