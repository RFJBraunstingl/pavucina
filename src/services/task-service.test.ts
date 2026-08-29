import assert from "node:assert/strict";
import test from "node:test";

import {
  addChildTask,
  flattenTasks,
  getTaskDate,
  moveTask,
  resizeTask,
  setTaskDate,
} from "./task-service.ts";
import { isGraph } from "./graph-service.ts";
import { createSeedGraph } from "../data/seed-graph.ts";
import { addDays, makeDateRange } from "../utils/date.ts";

test("graph timeline operations preserve relationships and calendar days", () => {
  let graph = createSeedGraph("2026-03-29");
  assert.equal(makeDateRange("2026-03-29").at(-1), "2026-04-25");
  assert.equal(addDays("2026-03-29", 1), "2026-03-30");
  assert.equal(flattenTasks(graph)[1].depth, 1);

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

  const cyclic = structuredClone(graph);
  cyclic.relationships.push({
    id: "cycle",
    type: "child",
    sourceId: "child-id",
    targetId: "project",
  });
  assert.equal(isGraph(cyclic), false);
});
