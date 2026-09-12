import assert from "node:assert/strict";
import test from "node:test";

import {
  isTaskDone,
  markTaskDone,
  migrateTaskCompletion,
  reopenTask,
} from "./task-completion-service.ts";
import { isGraph } from "./graph-service.ts";
import { removeUnusedDates, setTaskDate } from "./task-schedule-service.ts";
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

test("legacy done properties migrate to planned-end dates", () => {
  const planned = task("Planned");
  const fallback = task("Fallback");
  const open = task("Open");
  let graph = {
    version: 1,
    nodes: [
      { ...planned, properties: { name: "Planned", done: true } },
      { ...fallback, properties: { name: "Fallback", done: true } },
      { ...open, properties: { name: "Open", done: false } },
    ],
    relationships: [],
    inboxNodes: [{ ...task("Inbox"), properties: { name: "Inbox", done: true } }],
  } as unknown as Graph;
  graph = setTaskDate(graph, planned.id, "plannedEndDate", "2026-09-08");
  assert.equal(isGraph(graph), true);

  const migrated = migrateTaskCompletion(graph, "2026-09-12");
  const completionDate = (taskId: string) => dateValue(
    migrated,
    migrated.relationships.find(
      (item) => item.sourceId === taskId && item.type === "markedAsDone",
    )?.targetId,
  );
  assert.equal(completionDate(planned.id), "2026-09-08");
  assert.equal(completionDate(fallback.id), "2026-09-12");
  assert.equal(isTaskDone(migrated, open.id), false);
  assert.equal(
    [...migrated.nodes, ...(migrated.inboxNodes ?? [])].some(
      (node) => node.type === "task" && "done" in node.properties,
    ),
    false,
  );
  assert.equal(migrateTaskCompletion(migrated, "2026-09-12"), migrated);
  assert.equal(isGraph(migrated), true);
});
