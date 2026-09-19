import "server-only";
import { BSON } from "mongodb";
import { getMongoDatabase } from "./mongodb";
import type { GraphCommit, GraphRecordRevision, PublishedGraphRecord } from "../types/graph-commit";
import type { GraphRecord, GraphRevision } from "../types/graph-sync";

let indexes: Promise<unknown> | undefined;
export async function graphCollections() {
  const database = await getMongoDatabase();
  const commits = database.collection<GraphCommit>("graph_commits");
  const records = database.collection<GraphRecordRevision>("graph_records");
  indexes ??= Promise.all([
    commits.createIndex({ userId: 1, sequence: 1 }, { unique: true }),
    commits.createIndex({ userId: 1, mutationId: 1 }, { unique: true }),
    records.createIndex({ userId: 1, generation: 1, collection: 1, id: 1, sequence: -1 }),
    records.createIndex({ attemptId: 1 }),
    records.createIndex({ userId: 1, generation: 1, sequence: 1 }),
  ]).catch((error) => { indexes = undefined; throw error; });
  await indexes;
  return { commits, records };
}
export async function latestCommit(userId: string) {
  return (await graphCollections()).commits.findOne({ userId }, { sort: { sequence: -1 } });
}
export async function publishedRecords(userId: string, revision: GraphRevision, includeDeleted = false, after = -1) {
  const { records } = await graphCollections();
  return records.aggregate<PublishedGraphRecord>([
    { $match: { userId, generation: revision.generation, sequence: { $gt: after, $lte: revision.sequence } } },
    { $lookup: { from: "graph_commits", localField: "attemptId", foreignField: "_id", as: "commit" } },
    { $match: { "commit.0": { $exists: true } } },
    { $sort: { sequence: -1 } },
    { $group: { _id: { collection: "$collection", id: "$id" }, record: { $first: "$$ROOT" } } },
    { $replaceWith: "$record" },
    ...includeDeleted ? [] : [{ $match: { deleted: { $ne: true } } }],
    { $project: { _id: 0, collection: 1, id: 1, value: 1, order: 1, deleted: 1, sequence: 1 } },
    { $sort: { collection: 1, id: 1 } },
  ]).toArray();
}
export async function publishCommit(commit: GraphCommit, changed: GraphRecord[], importedIds: Set<string>) {
  const { commits, records } = await graphCollections();
  const revisions: GraphRecordRevision[] = changed.map((record) => ({ ...record,
    _id: crypto.randomUUID(), userId: commit.userId, generation: commit.generation,
    sequence: commit.sequence, attemptId: commit._id, createdAt: commit.createdAt,
    imported: importedIds.has(record.id) || Boolean(record.value && "sourceId" in record.value && importedIds.has(record.value.sourceId)),
  }));
  if (revisions.some((record) => BSON.calculateObjectSize(record, { ignoreUndefined: true }) >= 16 * 1024 * 1024)) {
    throw new Error("An individual graph record exceeds MongoDB's 16 MiB document limit.");
  }
  try {
    if (revisions.length) await records.insertMany(revisions);
    await commits.insertOne(commit);
  } catch (error) {
    if (!await commits.findOne({ _id: commit._id })) await records.deleteMany({ attemptId: commit._id });
    throw error;
  }
}
