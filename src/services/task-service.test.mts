import assert from "node:assert/strict";
import test from "node:test";

import {
  addChildTask,
  addTopLevelTask,
  deleteTask,
  flattenTasks,
  getLeafTasksForDate,
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
  setTaskDates,
} from "./task-schedule-service.ts";
import { ensureRootNode, isGraph, isUuid } from "./graph-service.ts";
import { createSeedGraph } from "../data/seed-graph.ts";
import { calendarItem, resizeTimeRange } from "../utils/calendar.ts";
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
    getLeafTasksForDate(graph, "2026-03-29").map(
      (task) => task.properties.name,
    ),
    ["Timeline interactions", "Design timeline"],
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
    getLeafTasksForDate(graph, "2026-03-29").find(
      (task) => task.id === frontendId,
    )?.properties.done,
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
    384,
  );
  assert.equal(
    calendarItem(project, "2026-04-06", "2026-04-27", "11:00", "13:00", "2026-04-06")
      ?.height,
    128,
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
      ["05:00", "06:00"],
      ["22:00", "23:00"],
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

test("deleting a task removes all descendants and orphaned dates", () => {
  let graph = createSeedGraph("2026-03-29");
  const taskId = (name: string) => {
    const task = graph.nodes.find(
      (node): node is TaskNode =>
        node.type === "task" && node.properties.name === name,
    );
    assert.ok(task);
    return task.id;
  };
  const prototypeId = taskId("Build prototype");
  const frontendId = taskId("Timeline interactions");
  const graphModelId = taskId("Graph data model");
  const designId = taskId("Design timeline");
  const grandchildId = crypto.randomUUID();
  graph = addChildTask(graph, frontendId, grandchildId);

  const deleted = deleteTask(graph, prototypeId);
  const deletedIds = new Set([
    prototypeId,
    frontendId,
    graphModelId,
    grandchildId,
  ]);
  assert.equal(deleted.nodes.some((node) => deletedIds.has(node.id)), false);
  assert.equal(
    deleted.relationships.some(
      (relationship) =>
        deletedIds.has(relationship.sourceId) ||
        deletedIds.has(relationship.targetId),
    ),
    false,
  );
  const usedDateIds = new Set(
    deleted.relationships
      .filter((relationship) => relationship.type !== "child")
      .map((relationship) => relationship.targetId),
  );
  assert.equal(
    deleted.nodes.every(
      (node) => node.type !== "date" || usedDateIds.has(node.id),
    ),
    true,
  );
  assert.equal(getTaskDate(deleted, designId, "plannedEndDate"), "2026-03-30");
  assert.equal(isGraph(deleted), true);
});

test("the structural root anchors visible top-level tasks", () => {
  const graph = createSeedGraph("2026-03-29");
  const root = graph.nodes.find((node) => node.type === "root");
  assert.ok(root);
  assert.equal(flattenTasks(graph)[0].task.properties.name, "Launch Pavucina");
  assert.equal(
    flattenTasks(graph, new Set([flattenTasks(graph)[0].task.id])).length,
    1,
  );
  const prototype = graph.nodes.find(
    (node): node is TaskNode =>
      node.type === "task" && node.properties.name === "Build prototype",
  );
  assert.ok(prototype);
  assert.deepEqual(
    flattenTasks(graph, new Set([prototype.id])).map(
      ({ task }) => task.properties.name,
    ),
    [
      "Launch Pavucina",
      "Research workflows",
      "Design timeline",
      "Build prototype",
      "Test the experience",
      "Release preview",
    ],
  );
  assert.equal(deleteTask(graph, root.id), graph);

  const legacy = {
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== root.id),
    relationships: graph.relationships.filter(
      (relationship) => relationship.sourceId !== root.id,
    ),
  };
  assert.equal(isGraph(legacy), true);
  assert.deepEqual(
    flattenTasks(ensureRootNode(legacy)).map(({ task }) => task.properties.name),
    flattenTasks(graph).map(({ task }) => task.properties.name),
  );

  const empty = deleteTask(graph, flattenTasks(graph)[0].task.id);
  assert.deepEqual(empty.nodes, [root]);
  const createdId = crypto.randomUUID();
  const created = addTopLevelTask(empty, createdId);
  assert.deepEqual(
    flattenTasks(created).map(({ task, depth }) => [task.properties.name, depth]),
    [["New task", 0]],
  );
  assert.equal(isGraph(created), true);
  const scheduled = setTaskDates(created, createdId, "2026-04-02", "2026-04-02");
  assert.deepEqual(
    [
      getTaskDate(scheduled, createdId, "plannedStartDate"),
      getTaskDate(scheduled, createdId, "plannedEndDate"),
    ],
    ["2026-04-02", "2026-04-02"],
  );
  const scheduledRoot = structuredClone(graph);
  scheduledRoot.relationships.push({
    id: crypto.randomUUID(),
    type: "plannedStartDate",
    sourceId: root.id,
    targetId: graph.nodes.find((node) => node.type === "date")!.id,
  });
  assert.equal(isGraph(scheduledRoot), false);
});
