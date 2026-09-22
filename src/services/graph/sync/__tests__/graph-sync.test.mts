import type { TaskNode } from "@/types/graph/graph.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { createSeedGraph } from "@/data/seed-graph.ts";
import { diffGraph, applyGraphOperations, GraphConflictError } from "../graph-patch-service.ts";
import { changedGraphRecords, recordsGraph, mergeRecords } from "../graph-record-service.ts";
import { renameTask, setTaskDescription } from "@/services/task/core/task-service.ts";
import { placeTask } from "@/services/task/ordering/task-order-service.ts";
import { markNodeDone } from "@/services/event/completion-service.ts";
import { diffPreferences, applyPreferencesPatch } from "@/services/preferences/settings-patch-service.ts";
import { DEFAULT_USER_PREFERENCES } from "@/services/preferences/preferences-service.ts";
import { isGraphPatch } from "../graph-sync-validation.ts";
import { isGraph } from "../../core/graph-service.ts";
import { readBoundedJson } from "@/services/http/request-json.ts";

const day = "2026-09-13";
const base = createSeedGraph(day);
const tasks = base.nodes.filter((node) => node.type === "task");
const id = tasks[0].id;
const revision = { generation: crypto.randomUUID(), sequence: 1 };

test("one field edit sends one field and writes one record", () => {
  const next = renameTask(base, id, "Renamed");
  const operations = diffGraph(base, next);
  assert.equal(operations.length, 1);
  assert.deepEqual(operations[0], { kind: "update", collection: "nodes", id, fields: { "properties.name": { before: tasks[0].properties.name, after: "Renamed" } } });
  const applied = applyGraphOperations(base, operations);
  assert.deepEqual(applied.nodes, next.nodes);
  assert.equal(isGraphPatch({ mutationId: crypto.randomUUID(), baseRevision: revision, operations }), true);
  const records = changedGraphRecords([], base);
  assert.equal(changedGraphRecords(records, next).length, 1);
  assert.deepEqual(recordsGraph(mergeRecords(records, changedGraphRecords(records, next))).nodes, next.nodes);
});

test("independent fields merge, repeated updates are idempotent, conflicts preserve inputs", () => {
  const operations = diffGraph(base, renameTask(base, id, "Mine"));
  const remote = setTaskDescription(base, id, "Saved description");
  const merged = applyGraphOperations(remote, operations);
  assert.equal(merged.nodes.find((node): node is TaskNode => node.type === "task" && node.id === id)?.properties.name, "Mine");
  assert.equal(merged.nodes.find((node): node is TaskNode => node.type === "task" && node.id === id)?.properties.description, "Saved description");
  assert.deepEqual(applyGraphOperations(merged, operations), merged);
  const conflict = renameTask(base, id, "Someone else's name");
  assert.throws(() => applyGraphOperations(conflict, operations), GraphConflictError);
  assert.equal(conflict.nodes.find((node): node is TaskNode => node.type === "task" && node.id === id)?.properties.name, "Someone else's name");
  assert.equal(applyGraphOperations(conflict, operations, true).nodes.find((node): node is TaskNode => node.type === "task" && node.id === id)?.properties.name, "Mine");
});

test("task order and completion are incremental and round-trip", () => {
  const siblings = base.relationships.filter((edge) => edge.type === "child" && edge.sourceId === base.relationships.find((edge) => edge.targetId === id)?.sourceId);
  if (siblings.length > 1) {
    const moved = placeTask(base, siblings[0].targetId, siblings.at(-1)!.targetId, "after", "all");
    const changes = diffGraph(base, moved);
    assert.equal(changes.filter((change) => change.kind === "move").length, 1);
    assert.deepEqual(applyGraphOperations(base, changes).relationships, moved.relationships);
    assert.equal(changedGraphRecords(changedGraphRecords([], base), moved).length, 1);
  }
  const done = markNodeDone(base, id, day);
  const applied = applyGraphOperations(base, diffGraph(base, done));
  assert.equal(isGraph(applied), true);
  assert.deepEqual(applied.relationships, done.relationships);
});

test("optional fields can be removed and large graphs still produce small patches", () => {
  const described = setTaskDescription(base, id, "Text");
  const cleared = setTaskDescription(described, id, "");
  assert.equal(applyGraphOperations(described, JSON.parse(JSON.stringify(diffGraph(described, cleared)))).nodes.find((node): node is TaskNode => node.type === "task" && node.id === id)?.properties.description, undefined);
  const large = { ...base, nodes: [...base.nodes, ...Array.from({ length: 40 }, () => ({ id: crypto.randomUUID(), type: "task" as const, properties: { name: "Large", description: "x".repeat(512 * 1024) } }))] };
  assert.ok(JSON.stringify(large).length > 16 * 1024 * 1024);
  assert.ok(JSON.stringify(diffGraph(large, renameTask(large, id, "Small update"))).length < 512);
});

test("preference patches merge set membership and reject same-field conflicts", () => {
  const before = DEFAULT_USER_PREFERENCES;
  const first = { ...before, collapsedTaskIds: [id] };
  const second = { ...before, collapsedTaskIds: [tasks[1].id] };
  assert.deepEqual(new Set(applyPreferencesPatch(second, diffPreferences(before, first)).collapsedTaskIds), new Set([id, tasks[1].id]));
  const patch = diffPreferences(before, { ...before, taskColumnWidth: 420 });
  assert.throws(() => applyPreferencesPatch({ ...before, taskColumnWidth: 400 }, patch), GraphConflictError);
});

test("request limits stop reading oversized streamed bodies without content-length", async () => {
  let cancelled = false;
  const request = new Request("http://localhost", { method: "PATCH", headers: { "content-type": "application/json" },
    body: new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(20)); }, cancel() { cancelled = true; } }), duplex: "half" } as RequestInit);
  const response = await readBoundedJson(request, 10);
  assert.ok(response instanceof Response);
  assert.equal(response.status, 413);
  assert.equal(cancelled, true);
});
