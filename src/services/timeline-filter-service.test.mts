import assert from "node:assert/strict";
import test from "node:test";

import { getTimelineFilter } from "./timeline-filter-service.ts";
import type { Graph } from "../types/graph.ts";

const graph: Graph = {
  version: 1,
  nodes: [
    { id: "root", type: "root", properties: {} },
    { id: "a", type: "task", properties: { name: "Alpha" } },
    { id: "b", type: "task", properties: { name: "Beta" } },
    { id: "a1", type: "task", properties: { name: "Alpha one" } },
    { id: "a2", type: "task", properties: { name: "Alpha two" } },
    { id: "b1", type: "task", properties: { name: "Beta one" } },
    { id: "a11", type: "task", properties: { name: "Alpha detail" } },
    { id: "date", type: "date", properties: { value: "2026-09-12" } },
  ],
  relationships: [
    { id: "r-a", type: "child", sourceId: "root", targetId: "a" },
    { id: "r-b", type: "child", sourceId: "root", targetId: "b" },
    { id: "a-a1", type: "child", sourceId: "a", targetId: "a1" },
    { id: "a-a2", type: "child", sourceId: "a", targetId: "a2" },
    { id: "b-b1", type: "child", sourceId: "b", targetId: "b1" },
    { id: "a1-a11", type: "child", sourceId: "a1", targetId: "a11" },
    { id: "done-b1", type: "markedAsDone", sourceId: "b1", targetId: "date" },
  ],
};

const names = (result: ReturnType<typeof getTimelineFilter>) =>
  result.tasks.map(({ task }) => task.properties.name);

test("timeline filters cascade through selected task branches", () => {
  const initial = getTimelineFilter(graph, [], false, new Set());
  assert.deepEqual(initial.levels[0].options.map(({ id }) => id), ["a", "b"]);

  const parents = getTimelineFilter(graph, [["a", "b"]], false, new Set());
  assert.deepEqual(parents.levels[1].options.map(({ id }) => id), ["a1", "a2", "b1"]);

  const child = getTimelineFilter(
    graph,
    [["a", "b"], ["a1"]],
    false,
    new Set(["a", "a1"]),
  );
  assert.deepEqual(names(child), ["Alpha", "Alpha one"]);
  assert.deepEqual([...child.expandedTaskIds], ["a"]);

  const grandchild = getTimelineFilter(
    graph,
    [["a"], ["a1"], ["a11"]],
    false,
    new Set(["a", "a1"]),
  );
  assert.deepEqual(names(grandchild), ["Alpha", "Alpha one", "Alpha detail"]);
  assert.deepEqual([...grandchild.expandedTaskIds], ["a1", "a"]);
});

test("timeline filters discard invalid selections and honor hidden tasks", () => {
  const invalid = getTimelineFilter(graph, [["a"], ["b1"]], false, new Set());
  assert.deepEqual(invalid.selections, [["a"]]);
  assert.deepEqual(names(invalid), ["Alpha", "Alpha one", "Alpha detail", "Alpha two"]);

  const hidden = getTimelineFilter(graph, [["b"], ["b1"]], true, new Set());
  assert.deepEqual(hidden.selections, [["b"]]);
  assert.equal(hidden.levels.length, 1);
  assert.deepEqual(names(hidden), ["Beta"]);
});
