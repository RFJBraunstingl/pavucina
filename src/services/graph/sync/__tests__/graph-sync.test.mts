import assert from "node:assert/strict";
import test from "node:test";

import { createSeedGraph } from "@/data/seed-graph.ts";
import { markNodeDone } from "@/services/event/completion-service.ts";
import { readBoundedJson } from "@/services/http/request-json.ts";
import { DEFAULT_USER_PREFERENCES } from "@/services/preferences/preferences-service.ts";
import {
  applyPreferencesPatch,
  diffPreferences,
  withoutConflictingPreferenceFields,
} from "@/services/preferences/patch/settings-patch-service.ts";
import { renameTask, setTaskDescription } from "@/services/task/core/task-service.ts";
import { placeTask } from "@/services/task/ordering/task-order-service.ts";
import type { Graph, TaskNode } from "@/types/graph/graph.ts";
import { isGraph } from "../../core/graph-service.ts";
import { GraphConflictError } from "../graph-conflict-error.ts";
import { applyGraphOperations } from "../graph-patch-service.ts";
import { diffGraph } from "../graph-diff-service.ts";
import {
  changedGraphRecords,
  mergeRecords,
  recordsGraph,
} from "../records/graph-record-service.ts";
import { isGraphPatch } from "../graph-sync-validation.ts";

const day = "2026-09-13";
const base = createSeedGraph(day);
const tasks = base.nodes.filter((node) => node.type === "task");
const id = tasks[0].id;
const revision = { generation: crypto.randomUUID(), sequence: 1 };

function taskNode(graph: Graph, taskId: string) {
  const node = graph.nodes.find(
    (candidate): candidate is TaskNode =>
      candidate.type === "task" && candidate.id === taskId,
  );
  assert.ok(node);
  return node;
}

test("one field edit sends one field and writes one record", () => {
  const next = renameTask(base, id, "Renamed");
  const operations = diffGraph(base, next);
  assert.equal(operations.length, 1);
  assert.deepEqual(operations[0], {
    kind: "update",
    collection: "nodes",
    id,
    fields: {
      "properties.name": {
        before: tasks[0].properties.name,
        after: "Renamed",
      },
    },
  });
  const applied = applyGraphOperations(base, operations);
  assert.deepEqual(applied.nodes, next.nodes);
  assert.equal(isGraphPatch({
    mutationId: crypto.randomUUID(),
    baseRevision: revision,
    operations,
  }), true);
  const records = changedGraphRecords([], base);
  assert.equal(changedGraphRecords(records, next).length, 1);
  const saved = mergeRecords(records, changedGraphRecords(records, next));
  assert.deepEqual(recordsGraph(saved).nodes, next.nodes);
});

test("independent fields merge, repeated updates are idempotent, conflicts preserve inputs", () => {
  const operations = diffGraph(base, renameTask(base, id, "Mine"));
  const remote = setTaskDescription(base, id, "Saved description");
  const merged = applyGraphOperations(remote, operations);
  assert.equal(taskNode(merged, id).properties.name, "Mine");
  assert.equal(
    taskNode(merged, id).properties.description,
    "Saved description",
  );
  assert.deepEqual(applyGraphOperations(merged, operations), merged);
  const conflict = renameTask(base, id, "Someone else's name");
  assert.throws(
    () => applyGraphOperations(conflict, operations),
    GraphConflictError,
  );
  assert.equal(taskNode(conflict, id).properties.name, "Someone else's name");
  const forced = applyGraphOperations(conflict, operations, true);
  assert.equal(taskNode(forced, id).properties.name, "Mine");
});

test("task order and completion are incremental and round-trip", () => {
  const parentId = base.relationships.find(
    (relationship) => relationship.targetId === id,
  )?.sourceId;
  const siblings = base.relationships.filter(
    (relationship) =>
      relationship.type === "child" && relationship.sourceId === parentId,
  );
  if (siblings.length > 1) {
    const moved = placeTask(
      base,
      siblings[0].targetId,
      siblings.at(-1)!.targetId,
      "after",
      "all",
    );
    const changes = diffGraph(base, moved);
    assert.equal(changes.filter((change) => change.kind === "move").length, 1);
    assert.deepEqual(
      applyGraphOperations(base, changes).relationships,
      moved.relationships,
    );
    const baseRecords = changedGraphRecords([], base);
    assert.equal(changedGraphRecords(baseRecords, moved).length, 1);
  }
  const done = markNodeDone(base, id, day);
  const applied = applyGraphOperations(base, diffGraph(base, done));
  assert.equal(isGraph(applied), true);
  assert.deepEqual(applied.relationships, done.relationships);
});

test("optional fields can be removed and large graphs still produce small patches", () => {
  const described = setTaskDescription(base, id, "Text");
  const cleared = setTaskDescription(described, id, "");
  const serializedOperations = JSON.parse(
    JSON.stringify(diffGraph(described, cleared)),
  );
  const applied = applyGraphOperations(described, serializedOperations);
  assert.equal(taskNode(applied, id).properties.description, undefined);
  const largeNodes = Array.from({ length: 40 }, () => ({
    id: crypto.randomUUID(),
    type: "task" as const,
    properties: {
      name: "Large",
      description: "x".repeat(512 * 1024),
    },
  }));
  const large = { ...base, nodes: [...base.nodes, ...largeNodes] };
  assert.ok(JSON.stringify(large).length > 16 * 1024 * 1024);
  const patch = diffGraph(large, renameTask(large, id, "Small update"));
  assert.ok(JSON.stringify(patch).length < 512);
});

test("preference patches merge set membership and reject same-field conflicts", () => {
  const before = DEFAULT_USER_PREFERENCES;
  const first = { ...before, collapsedTaskIds: [id] };
  const second = { ...before, collapsedTaskIds: [tasks[1].id] };
  const merged = applyPreferencesPatch(second, diffPreferences(before, first));
  assert.deepEqual(
    new Set(merged.collapsedTaskIds),
    new Set([id, tasks[1].id]),
  );
  const patch = diffPreferences(before, { ...before, taskColumnWidth: 420 });
  assert.throws(
    () => applyPreferencesPatch(
      { ...before, taskColumnWidth: 400 },
      patch,
    ),
    GraphConflictError,
  );
  assert.deepEqual(
    withoutConflictingPreferenceFields(
      [patch],
      [{ id: "preferences", field: "taskColumnWidth" }],
    ),
    [],
  );
});

test("request limits stop reading oversized streamed bodies without content-length", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(20));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("http://localhost", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
    duplex: "half",
  } as RequestInit);
  const response = await readBoundedJson(request, 10);
  assert.ok(response instanceof Response);
  assert.equal(response.status, 413);
  assert.equal(cancelled, true);
});
