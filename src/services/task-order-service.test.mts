import assert from "node:assert/strict";
import test from "node:test";

import { placeTask } from "./task-order-service.ts";
import { addTopLevelTask, flattenTasks } from "./task-service.ts";
import { isGraph } from "./graph-service.ts";
import { createSeedGraph } from "../data/seed-graph.ts";
import type { TaskNode } from "../types/graph.ts";

test("tasks can be reordered and reparented without breaking the graph", () => {
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
  const researchId = taskId("Research workflows");
  const designId = taskId("Design timeline");
  const prototypeId = taskId("Build prototype");
  const frontendId = taskId("Timeline interactions");
  const relationshipIds = graph.relationships.map(({ id }) => id);

  graph = placeTask(graph, designId, researchId, "before", "all");
  assert.deepEqual(
    flattenTasks(graph).slice(0, 3).map(({ task }) => task.properties.name),
    ["Launch Pavucina", "Design timeline", "Research workflows"],
  );

  graph = placeTask(graph, prototypeId, designId, "inside", "all");
  assert.deepEqual(
    flattenTasks(graph)
      .filter(({ task }) => [prototypeId, frontendId].includes(task.id))
      .map(({ task, depth }) => [task.properties.name, depth]),
    [
      ["Build prototype", 2],
      ["Timeline interactions", 3],
    ],
  );

  graph = placeTask(graph, prototypeId, researchId, "after", "all");
  assert.equal(
    graph.relationships.find(
      (relationship) =>
        relationship.type === "child" && relationship.targetId === prototypeId,
    )?.sourceId,
    projectId,
  );

  const topLevelId = crypto.randomUUID();
  graph = addTopLevelTask(graph, topLevelId);
  graph = placeTask(graph, topLevelId, projectId, "before", "all");
  assert.equal(flattenTasks(graph)[0].task.id, topLevelId);
  assert.equal(placeTask(graph, projectId, frontendId, "inside"), graph);
  const currentIds = graph.relationships.map(({ id }) => id);
  assert.equal(relationshipIds.every((id) => currentIds.includes(id)), true);
  assert.equal(isGraph(graph), true);
});
