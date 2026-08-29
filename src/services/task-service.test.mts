import assert from "node:assert/strict";
import test from "node:test";

import {
  addChildTask,
  flattenTasks,
  getTasksForDate,
  setTaskDone,
} from "./task-service.ts";
import {
  getTaskDate,
  getTaskTime,
  moveTask,
  moveScheduledTask,
  resizeTask,
  setTaskDate,
} from "./task-schedule-service.ts";
import { isGraph } from "./graph-service.ts";
import { createSeedGraph } from "../data/seed-graph.ts";
import { calendarItem } from "../utils/calendar.ts";
import { addDays, makeDateRange } from "../utils/date.ts";
import type { TaskNode } from "../types/graph.ts";

test("task graph operations preserve relationships and schedules", () => {
  let graph = createSeedGraph("2026-03-29");
  assert.equal(makeDateRange("2026-03-29").at(-1), "2026-04-25");
  assert.equal(addDays("2026-03-29", 1), "2026-03-30");
  assert.equal(flattenTasks(graph)[1].depth, 1);
  assert.deepEqual(
    getTasksForDate(graph, "2026-03-29").map((task) => task.id),
    ["project", "prototype", "frontend", "design"],
  );

  graph = setTaskDone(graph, "frontend", true);
  assert.equal(
    getTasksForDate(graph, "2026-03-29").find(
      (task) => task.id === "frontend",
    )?.properties.done,
    true,
  );

  graph = addChildTask(graph, "project", "child-id");
  assert.equal(getTaskDate(graph, "child-id", "plannedStartDate"), "2026-03-20");

  graph = moveTask(graph, "child-id", 2);
  assert.equal(getTaskDate(graph, "child-id", "plannedStartDate"), "2026-03-22");
  assert.equal(getTaskDate(graph, "child-id", "plannedEndDate"), "2026-04-12");

  graph = resizeTask(graph, "child-id", "start", 99);
  assert.equal(
    getTaskDate(graph, "child-id", "plannedStartDate"),
    getTaskDate(graph, "child-id", "plannedEndDate"),
  );

  graph = setTaskDate(graph, "child-id", "plannedStartDate", "2026-04-01");
  const sharedDates = graph.nodes.filter(
    (node) => node.type === "date" && node.properties.value === "2026-04-01",
  );
  assert.equal(sharedDates.length, 1);
  assert.equal(isGraph(graph), true);

  graph = moveScheduledTask(graph, "project", "2026-04-06", "11:00");
  assert.equal(getTaskDate(graph, "project", "plannedStartDate"), "2026-04-06");
  assert.equal(getTaskDate(graph, "project", "plannedEndDate"), "2026-04-27");
  assert.equal(getTaskTime(graph, "project", "plannedStartTime"), "11:00");
  assert.equal(getTaskTime(graph, "project", "plannedEndTime"), "12:00");
  const project = graph.nodes.find(
    (node): node is TaskNode => node.id === "project" && node.type === "task",
  );
  assert.ok(project);
  assert.equal(
    calendarItem(project, "2026-04-06", "2026-04-27", "11:00", "12:00", "2026-04-06")
      ?.top,
    192,
  );

  const cyclic = structuredClone(graph);
  cyclic.relationships.push({
    id: "cycle",
    type: "child",
    sourceId: "child-id",
    targetId: "project",
  });
  assert.equal(isGraph(cyclic), false);
});
