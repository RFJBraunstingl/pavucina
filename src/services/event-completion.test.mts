import assert from "node:assert/strict";
import test from "node:test";
import { BSON } from "mongodb";
import { isCompletionRelationship, isNodeDone, markNodeDone, reopenNode } from "./completion-service.ts";
import { createBackupArchive, readBackupArchive } from "./backup-service.ts";
import { DEFAULT_USER_PREFERENCES } from "./preferences-service.ts";
import { isGraph } from "./graph-service.ts";
import { saveNativeEvent, deleteNativeEvent } from "./native-event-service.ts";
import { reconcileCalendarBatch, removeImportedEvents, replaceImportedEventSubgraph } from "./event-service.ts";
import { getTodoItemsForDate } from "./todo-service.ts";
import type { Graph } from "../types/graph.ts";
import type { CalendarSyncBatch } from "../types/external-calendar.ts";

const day = "2026-09-13";
const nextDay = "2026-09-14";
const input = { name: "Meeting", description: "", location: "", timeZone: "UTC",
  startDate: day, endDate: nextDay, startTime: "09:00", endTime: "10:00" };
const batch: CalendarSyncBatch = {
  connectionId: crypto.randomUUID(), source: "google",
  calendar: { id: "work", name: "Work", color: "#4285f4" }, authoritative: false,
  changes: [], state: { calendarId: "work", cursor: "cursor", rangeStart: day,
    rangeEnd: "2027-09-13", refreshAfter: nextDay, timeZone: "UTC", syncedAt: new Date() },
};
batch.changes = [{ action: "upsert", event: {
  id: "meeting", connectionId: batch.connectionId, calendarId: "work", calendarName: "Work",
  title: "Imported", color: "#4285f4", allDay: true, start: day, end: "2026-09-15",
} }];

function fixture(imported = false) {
  let graph: Graph = { version: 1, nodes: [], relationships: [] };
  graph = imported ? reconcileCalendarBatch(graph, batch, "UTC")
    : saveNativeEvent(graph, crypto.randomUUID(), input, true);
  return { graph, id: graph.nodes.find((node) => node.type === "event")!.id };
}

test("native and imported events complete, reopen, retain history, and round-trip", () => {
  for (const imported of [false, true]) {
    const original = fixture(imported);
    const id = original.id;
    let graph = original.graph;
    assert.equal(reopenNode(graph, id, day), graph);
    graph = markNodeDone(graph, id, day);
    assert.equal(isNodeDone(graph, id), true);
    assert.equal(markNodeDone(graph, id, nextDay), graph);
    const duplicate = structuredClone(graph);
    duplicate.relationships.push({ ...graph.relationships.at(-1)!, id: crypto.randomUUID() });
    assert.equal(isGraph(duplicate), false);
    const wrongType = structuredClone(graph);
    wrongType.relationships.at(-1)!.type = "plannedStartDate";
    assert.equal(isGraph(wrongType), false);
    graph = reopenNode(graph, id, nextDay);
    assert.equal(isNodeDone(graph, id), false);
    assert.equal(graph.relationships.at(-2)!.type, "wasMarkedAsDone");
    assert.equal(graph.relationships.at(-1)!.type, "markedAsReopened");
    graph = markNodeDone(graph, id, nextDay);
    assert.equal(graph.nodes.filter((node) => node.type === "date").length, 2);
    assert.equal(isGraph(graph), true);
    const restored = readBackupArchive(createBackupArchive(graph, DEFAULT_USER_PREFERENCES)).graph;
    assert.deepEqual(restored.relationships, graph.relationships);
    assert.equal(isNodeDone(restored, id), true);
    assert.equal(isGraph(BSON.deserialize(BSON.serialize(graph, { ignoreUndefined: true }))), true);
    assert.equal(markNodeDone(graph, crypto.randomUUID(), day), graph);
    assert.throws(() => markNodeDone(graph, id, "invalid"));
    assert.throws(() => reopenNode(graph, id, "invalid"));
    for (const date of [day, nextDay]) {
      const items = getTodoItemsForDate(graph, date, [{
        id: batch.connectionId, source: "google", address: "test@example.com", status: "connected",
        calendars: [{ ...batch.calendar, selected: true, visible: true }],
      }]);
      assert.equal(items[0].id, id);
      assert.equal(isNodeDone(graph, id), true);
    }
    if (!imported) {
      const edited = saveNativeEvent(graph, id, { ...input, name: "Rescheduled", endTime: "12:00" }, false);
      assert.deepEqual(edited.relationships.filter((edge) => isCompletionRelationship(edge.type)),
        graph.relationships.filter((edge) => isCompletionRelationship(edge.type)));
      assert.equal(isGraph(deleteNativeEvent(edited, id)), true);
      assert.equal(deleteNativeEvent(edited, id).relationships.length, 0);
    } else {
      const refreshed = reconcileCalendarBatch(graph, {
        ...batch,
        changes: batch.changes.map((change) => change.action === "upsert"
          ? { ...change, event: { ...change.event, title: "Rescheduled", start: nextDay, end: "2026-09-16" } }
          : change),
      }, "UTC");
      assert.equal(isGraph(refreshed), true);
      assert.equal(isNodeDone(refreshed, id), true);
      assert.deepEqual(refreshed.relationships.filter((edge) => isCompletionRelationship(edge.type)),
        graph.relationships.filter((edge) => isCompletionRelationship(edge.type)));
      assert.equal(removeImportedEvents(refreshed).relationships.length, 0);
    }
  }
});

test("import adoption preserves in-flight completion and reopening, but accepts remote updates", () => {
  const { graph: open, id } = fixture(true);
  const done = markNodeDone(open, id, day);
  const reopened = reopenNode(done, id, nextDay);
  for (const [base, current, remote, expected] of [
    [open, done, open, done], [done, reopened, done, reopened],
    [open, open, done, done], [done, done, reopened, reopened],
  ]) {
    const adopted = replaceImportedEventSubgraph(current, remote, base);
    assert.equal(isGraph(adopted), true);
    assert.equal(isNodeDone(adopted, id), isNodeDone(expected, id));
    assert.deepEqual(adopted.relationships, expected.relationships);
    assert.equal(new Set(adopted.nodes.filter((node) => node.type === "date")
      .map((node) => node.properties.value)).size,
    adopted.nodes.filter((node) => node.type === "date").length);
  }
  const deleted = replaceImportedEventSubgraph(done, removeImportedEvents(open), open);
  assert.equal(deleted.nodes.length, 0);
  assert.equal(deleted.relationships.length, 0);
  assert.equal(isGraph(deleted), true);
});

test("adoption matches provider identity and remaps completion dates", () => {
  const { graph: base, id } = fixture(true);
  const current = markNodeDone(base, id, "2026-09-16");
  const remote = reconcileCalendarBatch({ version: 1, nodes: [], relationships: [] }, batch, "UTC");
  const remoteId = remote.nodes.find((node) => node.type === "event")!.id;
  assert.notEqual(remoteId, id);
  const adopted = replaceImportedEventSubgraph(current, remote, base);
  assert.equal(isNodeDone(adopted, remoteId), true);
  assert.equal(isGraph(adopted), true);
  const edge = adopted.relationships.find((edge) => edge.type === "markedAsDone")!;
  const date = adopted.nodes.find((node) => node.id === edge.targetId)!;
  assert.equal(date.type === "date" && date.properties.value, "2026-09-16");
});
