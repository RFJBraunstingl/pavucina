import assert from "node:assert/strict";
import test from "node:test";
import { createSeedGraph } from "../data/seed-graph.ts";
import { isGraph } from "./graph-service.ts";
import { loadGuestGraph, saveGuestGraph } from "./local-graph-store.ts";

test("guest loading preserves unsupported data and only seeds empty storage", () => {
  const descriptors = new Map(["window", "localStorage"].map((name) =>
    [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  let stored: string | null = null;
  let writes = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: () => stored,
    setItem: (_key: string, value: string) => { stored = value; writes++; },
  } });
  try {
    const graph = createSeedGraph("2026-09-13");
    assert.ok(isGraph(loadGuestGraph("2026-09-13")));
    assert.equal(writes, 0);
    assert.equal(saveGuestGraph(graph), true);
    assert.deepEqual(loadGuestGraph("2026-09-13"), graph);
    for (const value of ["", "{", "null", JSON.stringify({
      ...graph,
      nodes: graph.nodes.map((node) => node.type === "task"
        ? { ...node, properties: { ...node.properties, done: true } }
        : node),
    })]) {
      stored = value;
      assert.throws(() => loadGuestGraph("2026-09-13"), /invalid or unsupported/);
      assert.equal(stored, value);
      assert.equal(writes, 1);
    }
    stored = JSON.stringify(graph);
    assert.deepEqual(loadGuestGraph("2026-09-13"), graph);
  } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
