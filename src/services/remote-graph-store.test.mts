import assert from "node:assert/strict";
import test from "node:test";

import { createSeedGraph } from "../data/seed-graph.ts";
import { saveRemoteGraph } from "./remote-graph-store.ts";

test("guest imports do not overwrite an existing remote graph", async () => {
  const originalFetch = globalThis.fetch;
  let options: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    options = init;
    return new Response(null, { status: 412 });
  };

  try {
    const saved = await saveRemoteGraph(createSeedGraph("2026-08-30"), true);
    assert.equal(saved, false);
    assert.equal(new Headers(options?.headers).get("if-none-match"), "*");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
