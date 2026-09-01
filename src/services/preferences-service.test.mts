import assert from "node:assert/strict";
import test from "node:test";

import { isUserPreferences } from "./preferences-service.ts";
import {
  loadRemotePreferences,
  saveRemotePreferences,
} from "./remote-preferences-store.ts";

const taskId = "00000000-0000-4000-8000-000000000001";
const preferences = { collapsedTaskIds: [taskId], hideDone: false };

test("user preferences require unique task UUIDs and a hide-done flag", () => {
  assert.equal(isUserPreferences(preferences), true);
  assert.equal(
    isUserPreferences({ collapsedTaskIds: [taskId, taskId], hideDone: false }),
    false,
  );
  assert.equal(isUserPreferences({ collapsedTaskIds: ["task"], hideDone: false }), false);
  assert.equal(isUserPreferences({ collapsedTaskIds: [], hideDone: "yes" }), false);
});

test("remote preferences load and save the complete preference object", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ input: String(input), init });
    return init?.method === "PUT"
      ? new Response(null, { status: 204 })
      : Response.json(preferences);
  };

  try {
    assert.deepEqual(await loadRemotePreferences(), preferences);
    await saveRemotePreferences(preferences);
    assert.equal(requests[0].input, "/api/preferences");
    assert.equal(requests[0].init?.cache, "no-store");
    assert.equal(requests[1].init?.method, "PUT");
    assert.deepEqual(JSON.parse(String(requests[1].init?.body)), preferences);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
