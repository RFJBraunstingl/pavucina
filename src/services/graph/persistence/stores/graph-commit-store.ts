import "server-only";

import { BSON } from "mongodb";

import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import type {
  GraphCommit,
  GraphRecordRevision,
  PublishedGraphRecord,
} from "@/types/graph/storage/graph-commit";
import type {
  GraphRecord,
  GraphRevision,
} from "@/types/graph/graph-sync";

const MAX_MONGODB_DOCUMENT_SIZE = 16 * 1_024 * 1_024;
let indexesPromise: Promise<unknown> | undefined;

export async function graphCollections() {
  const database = await getMongoDatabase();
  const commits = database.collection<GraphCommit>("graph_commits");
  const records = database.collection<GraphRecordRevision>("graph_records");
  indexesPromise ??= Promise.all([
    commits.createIndex({ userId: 1, sequence: 1 }, { unique: true }),
    commits.createIndex({ userId: 1, mutationId: 1 }, { unique: true }),
    records.createIndex({
      userId: 1,
      generation: 1,
      collection: 1,
      id: 1,
      sequence: -1,
    }),
    records.createIndex({ attemptId: 1 }),
    records.createIndex({ userId: 1, generation: 1, sequence: 1 }),
  ]).catch((error) => {
    indexesPromise = undefined;
    throw error;
  });
  await indexesPromise;
  return { commits, records };
}

export async function latestCommit(userId: string) {
  return (await graphCollections()).commits.findOne(
    { userId },
    { sort: { sequence: -1 } },
  );
}

export async function publishedRecords(
  userId: string,
  revision: GraphRevision,
  options: {
    includeDeleted?: boolean;
    after?: number;
    ids?: string[];
  } = {},
) {
  const { includeDeleted = false, after = -1, ids } = options;
  const { records } = await graphCollections();
  return records.aggregate<PublishedGraphRecord>([
    {
      $match: {
        userId,
        generation: revision.generation,
        sequence: { $gt: after, $lte: revision.sequence },
        ...(ids && { id: { $in: ids } }),
      },
    },
    {
      $lookup: {
        from: "graph_commits",
        localField: "attemptId",
        foreignField: "_id",
        as: "commit",
      },
    },
    { $match: { "commit.0": { $exists: true } } },
    { $sort: { sequence: -1 } },
    {
      $group: {
        _id: { collection: "$collection", id: "$id" },
        record: { $first: "$$ROOT" },
      },
    },
    { $replaceWith: "$record" },
    ...(includeDeleted ? [] : [{ $match: { deleted: { $ne: true } } }]),
    {
      $project: {
        _id: 0,
        collection: 1,
        id: 1,
        value: 1,
        order: 1,
        deleted: 1,
        sequence: 1,
      },
    },
    { $sort: { collection: 1, id: 1 } },
  ]).toArray();
}

function recordIsImported(record: GraphRecord, importedIds: Set<string>) {
  return importedIds.has(record.id) || Boolean(
    record.value &&
    "sourceId" in record.value &&
    importedIds.has(record.value.sourceId),
  );
}

export async function publishCommit(
  commit: GraphCommit,
  changedRecords: GraphRecord[],
  importedIds: Set<string>,
) {
  const { commits, records } = await graphCollections();
  const revisions: GraphRecordRevision[] = changedRecords.map((record) => ({
    ...record,
    _id: crypto.randomUUID(),
    userId: commit.userId,
    generation: commit.generation,
    sequence: commit.sequence,
    attemptId: commit._id,
    createdAt: commit.createdAt,
    imported: recordIsImported(record, importedIds),
  }));
  const recordTooLarge = revisions.some((record) =>
    BSON.calculateObjectSize(record, { ignoreUndefined: true }) >=
      MAX_MONGODB_DOCUMENT_SIZE,
  );
  if (recordTooLarge) {
    throw new Error(
      "An individual graph record exceeds MongoDB's 16 MiB document limit.",
    );
  }

  try {
    if (revisions.length) await records.insertMany(revisions);
    await commits.insertOne(commit);
  } catch (error) {
    const commitExists = await commits.findOne({ _id: commit._id });
    if (!commitExists) await records.deleteMany({ attemptId: commit._id });
    throw error;
  }
}
