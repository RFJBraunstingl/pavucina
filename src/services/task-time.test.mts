import assert from "node:assert/strict";
import test from "node:test";

import { createSeedGraph } from "../data/seed-graph.ts";
import { setTaskTime } from "./task-service.ts";
import { getTaskTime } from "./task-schedule-service.ts";

test("task times can be edited and cleared", () => {
  const graph = createSeedGraph("2026-03-29");
  const task = graph.nodes.find((node) => node.type === "task");
  assert.ok(task);

  const updated = setTaskTime(graph, task.id, "plannedStartTime", "07:45");
  assert.equal(getTaskTime(updated, task.id, "plannedStartTime"), "07:45");

  const cleared = setTaskTime(updated, task.id, "plannedStartTime", "");
  assert.equal(getTaskTime(cleared, task.id, "plannedStartTime"), undefined);
  assert.throws(() => setTaskTime(graph, task.id, "plannedStartTime", "25:00"));
});
