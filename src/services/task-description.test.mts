import assert from "node:assert/strict";
import test from "node:test";

import { createSeedGraph } from "../data/seed-graph.ts";
import { isGraph } from "./graph-service.ts";
import { setTaskDescription } from "./task-service.ts";

test("task descriptions can contain long text and be cleared", () => {
  const graph = createSeedGraph("2026-03-29");
  const task = graph.nodes.find((node) => node.type === "task");
  assert.ok(task);

  const description = "First paragraph.\n\nSecond paragraph.";
  const updated = setTaskDescription(graph, task.id, description);
  const updatedTask = updated.nodes.find((node) => node.id === task.id);
  assert.equal(
    updatedTask?.type === "task" && updatedTask.properties.description,
    description,
  );
  assert.equal(isGraph(updated), true);

  const cleared = setTaskDescription(updated, task.id, "");
  const clearedTask = cleared.nodes.find((node) => node.id === task.id);
  assert.equal(
    clearedTask?.type === "task" && clearedTask.properties.description,
    undefined,
  );

  const invalid = {
    ...updated,
    nodes: updated.nodes.map((node) =>
      node.id === task.id
        ? { ...node, properties: { ...node.properties, description: 42 } }
        : node,
    ),
  };
  assert.equal(isGraph(invalid), false);
});
