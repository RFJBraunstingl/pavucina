import assert from "node:assert/strict";
import test from "node:test";

import {
  isTaskDone,
  markTaskDone,
  reopenTask,
} from "./task-completion-service.ts";
import { isGraph } from "./graph-service.ts";
import { removeUnusedDates } from "./task-schedule-service.ts";
import type { Graph, TaskNode } from "../types/graph.ts";

const task = (name: string): TaskNode => ({
  id: crypto.randomUUID(),
  type: "task",
  properties: { name },
});

function dateValue(graph: Graph, nodeId?: string) {
  const node = graph.nodes.find((item) => item.id === nodeId);
  return node?.type === "date" ? node.properties.value : undefined;
}

test("completion edges retain done and reopened history", () => {
  const item = task("Write tests");
  let graph: Graph = { version: 1, nodes: [item], relationships: [] };
  graph = markTaskDone(graph, item.id, "2026-09-10");
  const completed = graph.relationships.find(
    (relationship) => relationship.type === "markedAsDone",
  )!;

  assert.equal(isTaskDone(graph, item.id), true);
  assert.equal(dateValue(graph, completed.targetId), "2026-09-10");
  assert.equal(markTaskDone(graph, item.id, "2026-09-11"), graph);
  graph = reopenTask(graph, item.id, "2026-09-11");
  assert.equal(isTaskDone(graph, item.id), false);
  assert.equal(dateValue(graph, graph.relationships[1].targetId), "2026-09-11");
  assert.deepEqual(
    graph.relationships.map(({ id, type, targetId }) => [id, type, targetId]),
    [
      [completed.id, "wasMarkedAsDone", completed.targetId],
      [graph.relationships[1].id, "markedAsReopened", graph.relationships[1].targetId],
    ],
  );

  graph = markTaskDone(graph, item.id, "2026-09-11");
  assert.equal(isTaskDone(graph, item.id), true);
  assert.equal(graph.nodes.filter((node) => node.type === "date").length, 2);
  assert.equal(isGraph(removeUnusedDates(graph)), true);
  const duplicate = structuredClone(graph);
  duplicate.relationships.push({
    ...duplicate.relationships.find(
      (relationship) => relationship.type === "markedAsDone",
    )!,
    id: crypto.randomUUID(),
  });
  assert.equal(isGraph(duplicate), false);
  assert.throws(() => markTaskDone(graph, item.id, "not-a-date"));
});

test("completion properties are rejected in graph and inbox tasks", () => {
  for (const done of [true, false, undefined, null]) {
    const node = { ...task("Old task"), properties: { name: "Old task", done } };
    assert.equal(isGraph({ version: 1, nodes: [node], relationships: [] }), false);
    assert.equal(isGraph({ version: 1, nodes: [], inboxNodes: [node], relationships: [] }), false);
  }
});

test("marking a task completes every descendant but reopening does not", () => {
  const parent = task("Parent");
  const child = task("Child");
  const grandchild = task("Grandchild");
  const unrelated = task("Unrelated");
  let graph: Graph = {
    version: 1,
    nodes: [parent, child, grandchild, unrelated],
    relationships: [],
  };
  graph = markTaskDone(graph, child.id, "2026-09-10");
  graph = {
    ...graph,
    relationships: [
      ...graph.relationships,
      { id: crypto.randomUUID(), type: "child", sourceId: parent.id, targetId: child.id },
      { id: crypto.randomUUID(), type: "child", sourceId: child.id, targetId: grandchild.id },
    ],
  };
  const originalChildEdge = graph.relationships.find(
    (item) => item.sourceId === child.id && item.type === "markedAsDone",
  )!;
  graph = markTaskDone(graph, parent.id, "2026-09-12");

  assert.deepEqual(
    [parent, child, grandchild, unrelated].map((item) => isTaskDone(graph, item.id)),
    [true, true, true, false],
  );
  const newTargetIds = graph.relationships
    .filter(
      (item) =>
        item.type === "markedAsDone" && item.sourceId !== originalChildEdge.sourceId,
    )
    .map((item) => item.targetId);
  assert.equal(new Set(newTargetIds).size, 1);
  assert.equal(dateValue(graph, newTargetIds[0]), "2026-09-12");
  assert.equal(
    graph.relationships.find(
      (item) => item.sourceId === child.id && item.type === "markedAsDone",
    ),
    originalChildEdge,
  );
  assert.equal(markTaskDone(graph, parent.id, "2026-09-12"), graph);
  graph = reopenTask(graph, parent.id, "2026-09-13");
  assert.deepEqual(
    [parent, child, grandchild].map((item) => isTaskDone(graph, item.id)),
    [false, true, true],
  );
  assert.equal(isGraph(graph), true);
});
