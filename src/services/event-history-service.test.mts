import assert from "node:assert/strict";
import test from "node:test";
import type { Collection } from "mongodb";
import { purgeHistoricalEvents } from "./event-history-service.ts";
import type { EdgeVersionDocument, NodeRevisionDocument } from "../types/graph-storage.ts";

test("history cleanup only removes imported event revisions and their relationships", async () => {
  const revisions = ["native-old", "native-current", "imported-old", "imported-current"].map((id) => ({
    _id: id, userId: "user", node: { id: id.split("-")[0], type: "event", properties:
      id.startsWith("imported") ? { externalOrigin: { kind: "calendar" } } : {} },
  }));
  let removedRevisions: string[] = [];
  let removedEdges: string[] = [];
  let deletedDocuments: string[] = [];
  const nodes = {
    find: (query: Record<string, unknown>) => ({ toArray: async () => revisions.filter((revision) =>
      Object.entries(query).every(([path, value]) => path.split(".").reduce<unknown>((record, key) =>
        record && typeof record === "object" ? (record as Record<string, unknown>)[key] : undefined,
      revision) === value)) }),
    deleteMany: async ({ _id }: { _id: { $in: string[] } }) => { deletedDocuments = _id.$in; },
  };
  const edges = {
    findOne: async () => ({ nodeRevisionIds: ["native-current", "imported-current"], createdAt: new Date() }),
    find: () => ({ toArray: async () => [{ _id: "history", nodeRevisionIds: ["native-old", "imported-old"] }] }),
    updateMany: async (_query: unknown, pipeline: Array<{ $set: {
      nodeRevisionIds: { $setDifference: [string, string[]] };
      edges: { $filter: { cond: { $and: Array<{ $not: Array<{ $in: [string, string[]] }> }> } } };
    } }>) => {
      removedRevisions = pipeline[0].$set.nodeRevisionIds.$setDifference[1];
      removedEdges = pipeline[0].$set.edges.$filter.cond.$and[0].$not[0].$in[1];
    },
  };
  await purgeHistoricalEvents(edges as unknown as Collection<EdgeVersionDocument>,
    nodes as unknown as Collection<NodeRevisionDocument>, "user");
  assert.deepEqual(removedRevisions, ["imported-old", "imported-current"]);
  assert.deepEqual(removedEdges, ["imported"]);
  assert.deepEqual(deletedDocuments, ["imported-old"]);
});
