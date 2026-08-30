import assert from "node:assert/strict";
import test from "node:test";

import {
  addChildTask,
  flattenTasks,
  getTasksForDate,
  renameTask,
  setTaskDone,
} from "./task-service.ts";
import { createNodeRevisionPlan } from "./graph-version-service.ts";
import {
  getTaskDate,
  getTaskTime,
  moveTask,
  moveScheduledTask,
  resizeTask,
  setTaskDate,
} from "./task-schedule-service.ts";
import { isGraph, isUuid } from "./graph-service.ts";
import { createSeedGraph } from "../data/seed-graph.ts";
import { calendarItem } from "../utils/calendar.ts";
import { addDays, makeDateRange } from "../utils/date.ts";
import type { TaskNode } from "../types/graph.ts";

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
  const frontendId = taskId("Timeline interactions");
  assert.equal(makeDateRange("2026-03-29").at(-1), "2026-04-25");
  assert.equal(addDays("2026-03-29", 1), "2026-03-30");
  assert.equal(flattenTasks(graph)[1].depth, 1);
  assert.deepEqual(
    getTasksForDate(graph, "2026-03-29").map((task) => task.properties.name),
    ["Launch Pavucina", "Build prototype", "Timeline interactions", "Design timeline"],
  );
  assert.equal(
    [...graph.nodes, ...graph.relationships].every((item) => isUuid(item.id)),
    true,
  );
  const firstVersion = createNodeRevisionPlan(graph, []);
  const unchangedVersion = createNodeRevisionPlan(graph, firstVersion.inserted);
  assert.equal(firstVersion.inserted.length, graph.nodes.length);
  assert.equal(unchangedVersion.inserted.length, 0);
  assert.deepEqual(unchangedVersion.nodeRevisionIds, firstVersion.nodeRevisionIds);
  const renamedVersion = createNodeRevisionPlan(
    renameTask(graph, projectId, "Renamed project"),
    firstVersion.inserted,
  );
  assert.equal(renamedVersion.inserted.length, 1);

  graph = setTaskDone(graph, frontendId, true);
  assert.equal(
    getTasksForDate(graph, "2026-03-29").find(
      (task) => task.id === frontendId,
    )?.properties.done,
    true,
  );

  const childId = crypto.randomUUID();
  graph = addChildTask(graph, projectId, childId);
  assert.equal(getTaskDate(graph, childId, "plannedStartDate"), "2026-03-20");

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
    192,
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
