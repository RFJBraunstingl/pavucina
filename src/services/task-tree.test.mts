import assert from "node:assert/strict";
import test from "node:test";

import { createSeedGraph } from "../data/seed-graph.ts";
import { getParentTaskIds, getParentTaskNames } from "./task-service.ts";

test("only tasks with children are collapsible", () => {
  const graph = createSeedGraph("2026-03-29");
  const parentIds = getParentTaskIds(graph);
  const names = graph.nodes.flatMap((node) =>
    node.type === "task" && parentIds.has(node.id)
      ? [node.properties.name]
      : [],
  );

  assert.deepEqual(names, ["Launch Pavucina", "Build prototype"]);
});

test("task parent names follow the hierarchy from top to bottom", () => {
  const graph = createSeedGraph("2026-03-29");
  const taskIds = new Map(
    graph.nodes.flatMap((node) =>
      node.type === "task" ? [[node.properties.name, node.id]] : [],
    ),
  );

  assert.deepEqual(
    getParentTaskNames(graph, taskIds.get("Timeline interactions")!),
    ["Launch Pavucina", "Build prototype"],
  );
  assert.deepEqual(
    getParentTaskNames(graph, taskIds.get("Launch Pavucina")!),
    [],
  );
});
