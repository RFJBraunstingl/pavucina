import assert from "node:assert/strict";
import test from "node:test";

import {
  addInboxTask,
  addMailboxInboxTask,
  deleteInboxTask,
  moveInboxTask,
  renameInboxTask,
} from "./inbox-service.ts";
import { isGraph } from "./graph-service.ts";
import { getTaskDate, setTaskDates } from "./task-schedule-service.ts";
import { createSeedGraph } from "../data/seed-graph.ts";
import type { TaskNode } from "../types/graph.ts";

test("inbox tasks can be captured, edited, and deleted", () => {
  const id = crypto.randomUUID();
  let graph = addInboxTask(createSeedGraph("2026-09-10"), id, "  New idea  ");
  assert.equal(graph.inboxNodes?.[0]?.properties.name, "New idea");
  assert.equal(addInboxTask(graph, crypto.randomUUID(), "  "), graph);

  graph = renameInboxTask(graph, id, "  Better idea ");
  assert.equal(graph.inboxNodes?.[0]?.properties.name, "Better idea");
  graph = deleteInboxTask(graph, id);
  assert.deepEqual(graph.inboxNodes, []);
});

test("moving an inbox task creates one child and removes the detached node", () => {
  const id = crypto.randomUUID();
  let graph = addInboxTask(createSeedGraph("2026-09-10"), id, "Captured task");
  const parent = graph.nodes.find(
    (node): node is TaskNode =>
      node.type === "task" && node.properties.name === "Design timeline",
  );
  assert.ok(parent);
  graph = setTaskDates(graph, parent.id, "2026-09-10", "2026-09-11");

  const unchanged = moveInboxTask(graph, id, crypto.randomUUID(), "leaf");
  assert.equal(unchanged, graph);
  const moved = moveInboxTask(graph, id, parent.id, "leaf");

  assert.equal(moved.inboxNodes?.length, 0);
  const movedTask = moved.nodes.find(
    (node): node is TaskNode => node.id === id && node.type === "task",
  );
  assert.equal(
    movedTask?.properties.name,
    "Captured task",
  );
  assert.equal(
    moved.relationships.find(
      (relationship) =>
        relationship.type === "child" && relationship.targetId === id,
    )?.sourceId,
    parent.id,
  );
  assert.equal(getTaskDate(moved, parent.id, "plannedStartDate"), undefined);
});

test("inbox nodes stay outside graph relationships and use unique IDs", () => {
  const graph = createSeedGraph("2026-09-10");
  const inboxId = crypto.randomUUID();
  const withInbox = addInboxTask(graph, inboxId, "Detached task");
  assert.equal(isGraph(withInbox), true);
  assert.equal(
    isGraph({
      ...graph,
      inboxNodes: [
        {
          id: graph.nodes[0].id,
          type: "task",
          properties: { name: "Duplicate" },
        },
      ],
    }),
    false,
  );
  assert.equal(
    isGraph({
      ...withInbox,
      relationships: [
        ...withInbox.relationships,
        {
          id: crypto.randomUUID(),
          type: "child",
          sourceId: graph.nodes[0].id,
          targetId: inboxId,
        },
      ],
    }),
    false,
  );
});

test("mailbox tasks preserve context and do not duplicate", () => {
  const graph = createSeedGraph("2026-09-10");
  const message = {
    connectionId: crypto.randomUUID(),
    source: "gmail" as const,
    account: "me@example.com",
    id: "message-id",
    subject: "A request",
    sender: "Sender <sender@example.com>",
    receivedAt: "2026-09-10T10:00:00.000Z",
    preview: "Please take a look.",
  };
  const withMessage = addMailboxInboxTask(
    graph,
    crypto.randomUUID(),
    message,
  );
  assert.equal(withMessage.inboxNodes?.[0].properties.name, "A request");
  assert.match(withMessage.inboxNodes?.[0].properties.description ?? "", /Sender/);
  assert.equal(isGraph(withMessage), true);
  assert.equal(
    addMailboxInboxTask(withMessage, crypto.randomUUID(), message),
    withMessage,
  );
});
