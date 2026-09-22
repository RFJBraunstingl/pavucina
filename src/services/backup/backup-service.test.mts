import assert from "node:assert/strict";
import test from "node:test";

import { unzipSync, zipSync } from "fflate";

import { createSeedGraph } from "@/data/seed-graph.ts";
import { DEFAULT_USER_PREFERENCES } from "@/services/preferences/preferences-service.ts";
import {
  createBackupArchive,
  readBackupArchive,
} from "./backup-service.ts";

test("backup writes all workspace data and restores its contents", () => {
  const graph = {
    ...createSeedGraph("2026-09-10"),
    inboxNodes: [
      {
        id: crypto.randomUUID(),
        type: "task" as const,
        properties: {
          name: "Captured idea",
          description: "Details kept for TransE",
        },
      },
    ],
  };
  const archive = createBackupArchive(graph, DEFAULT_USER_PREFERENCES);

  assert.deepEqual(Object.keys(unzipSync(archive)).sort(), [
    "edges.json",
    "inbox.json",
    "nodes.json",
    "settings.json",
  ]);
  assert.deepEqual(readBackupArchive(archive), {
    graph,
    preferences: DEFAULT_USER_PREFERENCES,
  });
});

test("restore rejects incomplete backups", () => {
  assert.throws(
    () => readBackupArchive(zipSync({ "nodes.json": new Uint8Array() })),
    /Invalid backup: expected nodes\.json, edges\.json, settings\.json/,
  );
});

test("restore treats legacy backups as an empty inbox", () => {
  const graph = createSeedGraph("2026-09-10");
  const archive = zipSync({
    "nodes.json": new TextEncoder().encode(JSON.stringify(graph.nodes)),
    "edges.json": new TextEncoder().encode(JSON.stringify(graph.relationships)),
    "settings.json": new TextEncoder().encode(
      JSON.stringify(DEFAULT_USER_PREFERENCES),
    ),
  });

  assert.deepEqual(readBackupArchive(archive), {
    graph: { ...graph, inboxNodes: [] },
    preferences: DEFAULT_USER_PREFERENCES,
  });
});

test("restore rejects unsupported completion properties", () => {
  const taskId = crypto.randomUUID();
  const graph = {
    version: 1,
    nodes: [
      {
        id: taskId,
        type: "task",
        properties: { name: "Completed task", done: true },
      },
    ],
    relationships: [],
  };
  const archive = zipSync({
    "nodes.json": new TextEncoder().encode(JSON.stringify(graph.nodes)),
    "edges.json": new TextEncoder().encode(JSON.stringify(graph.relationships)),
    "settings.json": new TextEncoder().encode(
      JSON.stringify(DEFAULT_USER_PREFERENCES),
    ),
  });

  assert.throws(
    () => readBackupArchive(archive),
    /Invalid backup: nodes, inbox, or edges are invalid/,
  );
});
