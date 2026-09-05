import assert from "node:assert/strict";
import test from "node:test";

import {
  isUserPreferences,
  resolvedScheduleMode,
} from "./preferences-service.ts";
import {
  loadGuestPreferences,
  saveGuestPreferences,
} from "./local-preferences-store.ts";
import {
  loadRemotePreferences,
  saveRemotePreferences,
} from "./remote-preferences-store.ts";

const taskId = "00000000-0000-4000-8000-000000000001";
const legacyPreferences = { collapsedTaskIds: [taskId], hideDone: false };
const preferences = {
  ...legacyPreferences,
  taskColumnWidth: 320,
  scheduleMode: "all" as const,
};

test("user preferences validate task IDs, visibility, and column width", () => {
  assert.equal(isUserPreferences(legacyPreferences), true);
  assert.equal(resolvedScheduleMode(legacyPreferences), "leaf");
  assert.equal(isUserPreferences(preferences), true);
  assert.equal(
    isUserPreferences({ collapsedTaskIds: [taskId, taskId], hideDone: false }),
    false,
  );
  assert.equal(isUserPreferences({ collapsedTaskIds: ["task"], hideDone: false }), false);
  assert.equal(isUserPreferences({ collapsedTaskIds: [], hideDone: "yes" }), false);
  assert.equal(
    isUserPreferences({ ...legacyPreferences, taskColumnWidth: 100 }),
    false,
  );
  assert.equal(isUserPreferences({ ...preferences, unknown: true }), false);
  assert.equal(
    isUserPreferences({ ...preferences, scheduleMode: "parents" }),
    false,
  );
});

test("guest preferences persist locally and resolve legacy defaults", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });

  try {
    saveGuestPreferences(preferences);
    assert.deepEqual(loadGuestPreferences(), preferences);
    values.set(
      "pavucina.preferences.v1",
      JSON.stringify(legacyPreferences),
    );
    assert.equal(resolvedScheduleMode(loadGuestPreferences()), "leaf");
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
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
