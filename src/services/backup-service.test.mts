import assert from "node:assert/strict";
import test from "node:test";

import { unzipSync, zipSync } from "fflate";

import { createSeedGraph } from "../data/seed-graph.ts";
import { DEFAULT_USER_PREFERENCES } from "./preferences-service.ts";
import {
  createBackupArchive,
  readBackupArchive,
} from "./backup-service.ts";

test("backup writes three JSON files and restores their contents", () => {
  const graph = createSeedGraph("2026-09-10");
  const archive = createBackupArchive(graph, DEFAULT_USER_PREFERENCES);

  assert.deepEqual(Object.keys(unzipSync(archive)).sort(), [
    "edges.json",
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
