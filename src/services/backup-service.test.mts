import assert from "node:assert/strict";
import test from "node:test";

import { unzipSync, zipSync } from "fflate";

import { createSeedGraph } from "../data/seed-graph.ts";
import { DEFAULT_USER_PREFERENCES } from "./preferences-service.ts";
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
        properties: { name: "Captured idea" },
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
  assert.deepEqual(readBackupArchive(archive, "2026-09-10"), {
    graph,
    preferences: DEFAULT_USER_PREFERENCES,
  });
});

test("restore rejects incomplete backups", () => {
  assert.throws(
    () => readBackupArchive(zipSync({ "nodes.json": new Uint8Array() }), "2026-09-10"),
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

  assert.deepEqual(readBackupArchive(archive, "2026-09-10"), {
    graph: { ...graph, inboxNodes: [] },
    preferences: DEFAULT_USER_PREFERENCES,
  });
});

test("restore migrates legacy completion properties", () => {
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

  const restored = readBackupArchive(archive, "2026-09-12").graph;
  assert.equal("done" in restored.nodes[0].properties, false);
  const completion = restored.relationships.find(
    (relationship) => relationship.type === "markedAsDone",
  );
  assert.equal(completion?.sourceId, taskId);
  const completionDate = restored.nodes.find(
    (node) => node.id === completion?.targetId,
  );
  assert.equal(
    completionDate?.type === "date" ? completionDate.properties.value : undefined,
    "2026-09-12",
  );
});
