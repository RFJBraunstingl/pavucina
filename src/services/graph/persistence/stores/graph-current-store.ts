import "server-only";

import type { AnyBulkWriteOperation } from "mongodb";

import { publishedRecords } from "./graph-commit-store";
import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import type { GraphCommit } from "@/types/graph/storage/graph-commit";
import type {
  GraphCurrentDocument,
  GraphCurrentHeadDocument,
  GraphCurrentRecordDocument,
} from "@/types/graph/storage/graph-current";
import type { GraphRecord } from "@/types/graph/graph-sync";

const headId = (userId: string) => `head:${userId}`;
const recordId = (userId: string, generation: string, record: GraphRecord) =>
  `${userId}:${generation}:${record.collection}:${record.id}`;

let index: Promise<string> | undefined;

export async function graphCurrentCollection() {
  const collection = (await getMongoDatabase())
    .collection<GraphCurrentDocument>("graph_current");
  index ??= collection.createIndex({ kind: 1, userId: 1, generation: 1 })
    .catch((error) => { index = undefined; throw error; });
  await index;
  return collection;
}

async function projectedHead(userId: string) {
  return (await graphCurrentCollection()).findOne({
    _id: headId(userId),
    kind: "head",
  }) as Promise<GraphCurrentHeadDocument | null>;
}

async function writeCurrentRecords(
  userId: string,
  generation: string,
  records: Awaited<ReturnType<typeof publishedRecords>>,
) {
  if (!records.length) return;
  const operations: AnyBulkWriteOperation<GraphCurrentDocument>[] = records.map((record) => {
    const document: GraphCurrentRecordDocument = {
      ...record,
      _id: recordId(userId, generation, record),
      kind: "record",
      userId,
      generation,
    };
    return { updateOne: {
      filter: { _id: document._id },
      update: [{ $replaceWith: { $cond: [
        { $lt: [{ $ifNull: ["$sequence", -1] }, record.sequence] },
        { $literal: document },
        "$$ROOT",
      ] } }],
      upsert: true,
    } };
  });
  await (await graphCurrentCollection()).bulkWrite(operations, { ordered: false });
}

async function advanceHead(
  userId: string,
  before: GraphCurrentHeadDocument | null,
  target: GraphCommit,
) {
  const collection = await graphCurrentCollection();
  const document: GraphCurrentHeadDocument = {
    _id: headId(userId),
    kind: "head",
    userId,
    generation: target.generation,
    sequence: target.sequence,
  };
  if (!before) {
    try { await collection.insertOne(document); return true; }
    catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) return false;
      throw error;
    }
  }
  const result = await collection.replaceOne({
    _id: before._id,
    kind: "head",
    generation: before.generation,
    sequence: before.sequence,
  }, document);
  return result.modifiedCount === 1;
}

export async function advanceCurrentGraph(userId: string, target: GraphCommit) {
  for (let retry = 0; retry < 5; retry++) {
    const before = await projectedHead(userId);
    if (before && before.sequence >= target.sequence) return;
    const after = before?.generation === target.generation ? before.sequence : -1;
    const records = await publishedRecords(userId, target, true, after);
    await writeCurrentRecords(userId, target.generation, records);
    if (await advanceHead(userId, before, target)) return;
  }
  throw new Error("The current graph projection is busy. Please retry.");
}

export async function currentGraphRecords(userId: string, target: GraphCommit) {
  await advanceCurrentGraph(userId, target);
  const documents = await (await graphCurrentCollection()).find({
    kind: "record",
    userId,
    generation: target.generation,
    deleted: { $ne: true },
  }).toArray() as GraphCurrentRecordDocument[];
  return documents.map(({ collection, id, value, order, deleted, sequence }) => ({
    collection, id, value, order, deleted, sequence,
  }));
}
