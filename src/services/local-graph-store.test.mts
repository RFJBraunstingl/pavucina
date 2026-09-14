import assert from "node:assert/strict";
import test from "node:test";
import { createSeedGraph } from "../data/seed-graph.ts";
import { parseLegacyGraph } from "./local-graph-store.ts";

test("browser migration validates legacy graphs without modifying source data", () => {
  const graph = createSeedGraph("2026-09-13");
  const stored = JSON.stringify(graph);
  assert.deepEqual(parseLegacyGraph(stored, "2026-09-13"), graph);
  assert.equal(stored, JSON.stringify(graph));
  for (const invalid of ["", "{", "null", JSON.stringify({ ...graph, nodes: graph.nodes.map((node) => node.type === "task"
    ? { ...node, properties: { ...node.properties, done: true } } : node) })]) {
    assert.throws(() => parseLegacyGraph(invalid, "2026-09-13"), /invalid or unsupported/);
  }
});
