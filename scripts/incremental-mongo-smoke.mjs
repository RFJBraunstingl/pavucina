// Uses a dedicated database and random user; requires standalone MongoDB on localhost.
import assert from "node:assert/strict";
process.env.MONGODB_URI = process.env.INCREMENTAL_TEST_MONGODB_URI ?? "mongodb://pavucina:pavucina@127.0.0.1:27017/pavucina_incremental_test?authSource=admin";
const { getMongoDatabase } = await import("../src/services/infrastructure/mongodb.ts");
const { replaceGraph, loadGraphSnapshot, patchGraph, updateGraphVersion } = await import("../src/services/graph/persistence/graph-repository.ts");
const { graphCollections, publishCommit, publishedRecords } = await import("../src/services/graph/persistence/graph-commit-store.ts");
const { pruneGraphStorage } = await import("../src/services/graph/persistence/graph-maintenance-service.ts");
const { recordsGraph } = await import("../src/services/graph/sync/graph-record-service.ts");
const { diffGraph } = await import("../src/services/graph/sync/graph-patch-service.ts");
const { createSeedGraph } = await import("../src/data/seed-graph.ts");
const { renameTask, setTaskDescription } = await import("../src/services/task/core/task-service.ts");
const { saveNativeEvent } = await import("../src/services/event/native/native-event-service.ts");
const { markNodeDone, isNodeDone } = await import("../src/services/event/completion-service.ts");
const { removeImportedEvents } = await import("../src/services/event/event-service.ts");
const { patchPreferences, loadPreferences } = await import("../src/services/preferences/storage/preferences-repository.ts");
const { DEFAULT_USER_PREFERENCES } = await import("../src/services/preferences/preferences-service.ts");
const userId = crypto.randomUUID();
const database = await getMongoDatabase();
const { commits, records } = await graphCollections();
const current = database.collection("graph_current");
const graph = createSeedGraph("2026-09-13");
const id = graph.nodes.find((node) => node.type === "task").id;
const patch = (snapshot, next) => ({ mutationId: crypto.randomUUID(), baseRevision: snapshot.revision, operations: diffGraph(recordsGraph(snapshot.records), next) });
try {
  const legacyNodes = graph.nodes.map((node) => ({ _id: crypto.randomUUID(), userId, node }));
  await database.collection("nodes").insertMany(legacyNodes);
  await database.collection("edges").insertOne({ _id: crypto.randomUUID(), userId, graphSchemaVersion: 1,
    nodeRevisionIds: legacyNodes.map(({ _id }) => _id), inboxNodeRevisionIds: [], edges: graph.relationships, createdAt: new Date() });
  assert.deepEqual(recordsGraph((await loadGraphSnapshot(userId)).records), graph);
  assert.equal(await database.collection("nodes").countDocuments({ userId }), legacyNodes.length);
  const initial = await loadGraphSnapshot(userId);
  assert.deepEqual(await current.findOne({ _id: `head:${userId}` }, { projection: { _id: 0, generation: 1, sequence: 1 } }), initial.revision);
  assert.equal(await current.countDocuments({ kind: "record", userId, generation: initial.revision.generation }), initial.records.length);
  const beforeCount = await records.countDocuments({ userId });
  const first = patch(initial, renameTask(graph, id, "Changed"));
  await patchGraph(userId, first);
  assert.equal(await records.countDocuments({ userId }), beforeCount + 1);
  assert.equal((await publishedRecords(userId, (await loadGraphSnapshot(userId)).revision, true, initial.revision.sequence)).length, 1);
  const count = await commits.countDocuments({ userId });
  await patchGraph(userId, first);
  assert.equal(await commits.countDocuments({ userId }), count);
  await patchGraph(userId, patch(initial, setTaskDescription(graph, id, "Independent edit")));
  let saved = recordsGraph((await loadGraphSnapshot(userId)).records);
  assert.equal(saved.nodes.find((node) => node.id === id).properties.name, "Changed");
  assert.equal(saved.nodes.find((node) => node.id === id).properties.description, "Independent edit");
  await assert.rejects(() => patchGraph(userId, patch(initial, renameTask(graph, id, "Conflict"))), /conflict/);
  const snapshot = await loadGraphSnapshot(userId);
  await Promise.all([
    patchGraph(userId, patch(snapshot, renameTask(saved, id, "Concurrent name"))),
    patchGraph(userId, patch(snapshot, setTaskDescription(saved, id, "Concurrent description"))),
  ]);
  saved = recordsGraph((await loadGraphSnapshot(userId)).records);
  assert.equal(saved.nodes.find((node) => node.id === id).properties.name, "Concurrent name");
  assert.equal(saved.nodes.find((node) => node.id === id).properties.description, "Concurrent description");
  const orphanId = crypto.randomUUID();
  await records.insertOne({ _id: orphanId, userId, generation: initial.revision.generation, sequence: 999,
    attemptId: crypto.randomUUID(), collection: "nodes", id, value: { id, type: "task", properties: { name: "Invisible" } }, order: 0, imported: false, createdAt: new Date() });
  assert.equal(recordsGraph((await loadGraphSnapshot(userId)).records).nodes.find((node) => node.id === id).properties.name, "Concurrent name");
  const oldOrphanId = crypto.randomUUID();
  await records.insertOne({ _id: oldOrphanId, userId, generation: initial.revision.generation, sequence: 998,
    attemptId: crypto.randomUUID(), collection: "nodes", id, value: { id, type: "task", properties: { name: "Old orphan" } }, order: 0, imported: false, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) });
  const maintenance = await pruneGraphStorage();
  assert.equal(maintenance.unpublishedRecordsDeleted, 1);
  assert.equal(await records.countDocuments({ _id: oldOrphanId }), 0);
  assert.equal(await records.countDocuments({ _id: orphanId }), 1);
  await records.deleteOne({ _id: orphanId });
  const eventId = crypto.randomUUID();
  await updateGraphVersion(userId, (current) => {
    const next = saveNativeEvent(current, eventId, { name: "Imported", description: "Provider payload", location: "", timeZone: "UTC",
      startDate: "2026-09-13", endDate: "2026-09-13", startTime: "09:00", endTime: "10:00" }, true);
    next.nodes.find((node) => node.id === eventId).properties.externalOrigin = { kind: "calendar", source: "google", connectionId: crypto.randomUUID(), calendarId: "work", eventId: "event" };
    return next;
  });
  await updateGraphVersion(userId, (current) => markNodeDone(current, eventId, "2026-09-13"));
  assert.equal(isNodeDone(recordsGraph((await loadGraphSnapshot(userId)).records), eventId), true);
  await updateGraphVersion(userId, (current) => removeImportedEvents(current));
  assert.equal(await records.countDocuments({ userId, id: eventId, value: { $exists: true } }), 0);
  const prior = await loadGraphSnapshot(userId);
  await replaceGraph(userId, graph);
  const replacement = await loadGraphSnapshot(userId);
  assert.notEqual(replacement.revision.generation, prior.revision.generation);
  const pruned = await pruneGraphStorage();
  assert.ok(pruned.staleCurrentRecordsDeleted > 0);
  assert.equal(await current.countDocuments({ kind: "record", userId, generation: prior.revision.generation }), 0);
  await current.deleteMany({ userId });
  assert.deepEqual(await loadGraphSnapshot(userId), replacement);
  await assert.rejects(() => patchGraph(userId, patch(prior, renameTask(recordsGraph(prior.records), id, "Stale"))), /conflict/);
  await Promise.all([
    patchPreferences(userId, { fields: { hideDone: { before: DEFAULT_USER_PREFERENCES.hideDone, after: false } } }),
    patchPreferences(userId, { fields: { showFullTaskPath: { before: false, after: true } } }),
  ]);
  assert.equal((await loadPreferences(userId)).hideDone, false);
  assert.equal((await loadPreferences(userId)).showFullTaskPath, true);
  const large = { ...graph, nodes: [...graph.nodes, ...Array.from({ length: 20 }, () => ({
    id: crypto.randomUUID(), type: "task", properties: { name: "Large", description: "x".repeat(1024 * 1024) },
  }))] };
  await replaceGraph(userId, large);
  const largeSnapshot = await loadGraphSnapshot(userId);
  assert.deepEqual(recordsGraph(largeSnapshot.records), large);
  const largeCount = await records.countDocuments({ userId });
  await patchGraph(userId, patch(largeSnapshot, renameTask(large, id, "Small update to large graph")));
  assert.equal(await records.countDocuments({ userId }), largeCount + 1);
  const head = await commits.findOne({ userId }, { sort: { sequence: -1 } });
  const failedAttempt = crypto.randomUUID();
  await assert.rejects(() => publishCommit({ ...head, _id: failedAttempt, mutationId: crypto.randomUUID() },
    [{ ...largeSnapshot.records[0], order: 999 }], new Set()), /duplicate key/);
  assert.equal(await records.countDocuments({ attemptId: failedAttempt }), 0);
  assert.equal((await loadGraphSnapshot(userId)).revision.sequence, head.sequence);
  console.log("PASS: standalone atomic publication, incremental writes, duplicate retries, concurrent edits, conflicts, imported cleanup, restore generations, settings, legacy migration, 20 MiB graph, failed publication rollback");
} finally {
  for (const name of ["graph_current", "graph_records", "graph_commits", "nodes", "edges", "settings"]) await database.collection(name).deleteMany({ userId });
  await (await globalThis.pavucinaMongoClient).close();
}
