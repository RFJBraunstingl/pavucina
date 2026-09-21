import "server-only";

import { graphCurrentCollection } from "./graph-current-store";
import { graphCollections } from "./graph-commit-store";

const DAY_MS = 24 * 60 * 60 * 1_000;
const BATCH_SIZE = 1_000;
const MAX_BATCHES = 10;

async function pruneUnpublishedRecords(cutoff: Date) {
  const { records } = await graphCollections();
  await records.createIndex({ createdAt: 1 });
  let deletedCount = 0;
  let hasMore = false;
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const abandoned = await records.aggregate<{ _id: string }>([
      { $match: { createdAt: { $lt: cutoff } } },
      { $lookup: { from: "graph_commits", localField: "attemptId", foreignField: "_id", as: "commit" } },
      { $match: { "commit.0": { $exists: false } } },
      { $limit: BATCH_SIZE + 1 },
      { $project: { _id: 1 } },
    ]).toArray();
    const ids = abandoned.slice(0, BATCH_SIZE).map(({ _id }) => _id);
    if (ids.length) deletedCount += (await records.deleteMany({ _id: { $in: ids } })).deletedCount;
    hasMore = abandoned.length > BATCH_SIZE;
    if (!hasMore) break;
  }
  return { deletedCount, hasMore };
}

async function pruneStaleCurrentRecords(limit: number) {
  const collection = await graphCurrentCollection();
  const stale = await collection.aggregate<{ _id: string }>([
    { $match: { kind: "record" } },
    { $lookup: { from: "graph_current", let: { owner: "$userId", revision: "$generation" }, pipeline: [
      { $match: { $expr: { $and: [
        { $eq: ["$kind", "head"] },
        { $eq: ["$userId", "$$owner"] },
        { $eq: ["$generation", "$$revision"] },
      ] } } },
      { $limit: 1 },
    ], as: "activeHead" } },
    { $match: { "activeHead.0": { $exists: false } } },
    { $limit: limit + 1 },
    { $project: { _id: 1 } },
  ]).toArray();
  const ids = stale.slice(0, limit).map(({ _id }) => _id);
  const deletedCount = ids.length
    ? (await collection.deleteMany({ _id: { $in: ids } })).deletedCount
    : 0;
  return { deletedCount, hasMore: stale.length > limit };
}

export async function pruneGraphStorage() {
  const cutoff = new Date(Date.now() - DAY_MS);
  const unpublished = await pruneUnpublishedRecords(cutoff);
  const stale = await pruneStaleCurrentRecords(BATCH_SIZE * MAX_BATCHES);
  return {
    cutoff: cutoff.toISOString(),
    unpublishedRecordsDeleted: unpublished.deletedCount,
    staleCurrentRecordsDeleted: stale.deletedCount,
    hasMore: unpublished.hasMore || stale.hasMore,
  };
}
