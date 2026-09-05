import assert from "node:assert/strict";
import test from "node:test";

import { createSeedGraph } from "../data/seed-graph.ts";
import { placeTask } from "./task-order-service.ts";
import {
  clearParentTaskSchedules,
  clearTaskSchedule,
  getEffectiveTaskDate,
} from "./task-schedule-mode-service.ts";
import {
  getTaskDate,
  getTaskTime,
  setTaskDates,
  setTaskTimes,
} from "./task-schedule-service.ts";
import { addChildTask } from "./task-service.ts";
import type { Graph, TaskNode } from "../types/graph.ts";

function taskId(graph: Graph, name: string) {
  const task = graph.nodes.find(
    (node): node is TaskNode =>
      node.type === "task" && node.properties.name === name,
  );
  assert.ok(task);
  return task.id;
}

test("leaf mode rolls up dates without storing parent schedules", () => {
  const graph = createSeedGraph("2026-03-29");
  const projectId = taskId(graph, "Launch Pavucina");
  const prototypeId = taskId(graph, "Build prototype");
  const releaseId = taskId(graph, "Release preview");

  assert.equal(getTaskDate(graph, projectId, "plannedStartDate"), undefined);
  assert.equal(getTaskTime(graph, projectId, "plannedStartTime"), undefined);
  assert.deepEqual(
    [
      getEffectiveTaskDate(graph, projectId, "plannedStartDate", "leaf"),
      getEffectiveTaskDate(graph, projectId, "plannedEndDate", "leaf"),
      getEffectiveTaskDate(graph, prototypeId, "plannedStartDate", "leaf"),
      getEffectiveTaskDate(graph, prototypeId, "plannedEndDate", "leaf"),
    ],
    ["2026-03-20", "2026-04-10", "2026-03-29", "2026-04-04"],
  );
  assert.equal(
    getEffectiveTaskDate(
      clearTaskSchedule(graph, releaseId),
      projectId,
      "plannedEndDate",
      "leaf",
    ),
    "2026-04-08",
  );
});

test("gaining a child clears the new parent only in leaf mode", () => {
  const graph = createSeedGraph("2026-03-29");
  const designId = taskId(graph, "Design timeline");
  const researchId = taskId(graph, "Research workflows");

  const added = addChildTask(graph, designId, crypto.randomUUID(), "leaf");
  assert.equal(getTaskDate(added, designId, "plannedStartDate"), undefined);
  assert.equal(getTaskTime(added, designId, "plannedStartTime"), undefined);

  const retained = addChildTask(graph, designId, crypto.randomUUID(), "all");
  assert.equal(
    getTaskDate(retained, designId, "plannedStartDate"),
    "2026-03-25",
  );
  assert.equal(getTaskTime(retained, designId, "plannedStartTime"), "13:00");

  const nested = placeTask(graph, researchId, designId, "inside", "leaf");
  assert.equal(getTaskDate(nested, designId, "plannedStartDate"), undefined);
  assert.equal(getTaskTime(nested, designId, "plannedStartTime"), undefined);
});

test("enabling leaf mode removes every stored parent schedule", () => {
  let graph = createSeedGraph("2026-03-29");
  const projectId = taskId(graph, "Launch Pavucina");
  graph = setTaskTimes(
    setTaskDates(graph, projectId, "2026-03-01", "2026-04-30"),
    projectId,
    "08:00",
    "18:00",
  );

  assert.equal(
    getEffectiveTaskDate(graph, projectId, "plannedStartDate", "all"),
    "2026-03-01",
  );
  const cleared = clearParentTaskSchedules(graph);
  assert.equal(getTaskDate(cleared, projectId, "plannedStartDate"), undefined);
  assert.equal(getTaskTime(cleared, projectId, "plannedStartTime"), undefined);
  assert.equal(
    getEffectiveTaskDate(cleared, projectId, "plannedStartDate", "leaf"),
    "2026-03-20",
  );
});
