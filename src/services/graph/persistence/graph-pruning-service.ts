import "server-only";

import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import {
  graphCollections,
  publishedRecords,
} from "./stores/graph-commit-store";
import type { GraphRevision } from "@/types/graph/graph-sync";

async function pruneCurrentGeneration(
  userId: string,
  revision: GraphRevision,
  affectedIds: Set<string>,
) {
  const { records } = await graphCollections();
  const latestRecords = await publishedRecords(userId, revision, true);
  for (const record of latestRecords) {
    if (!affectedIds.has(record.id)) continue;
    await records.deleteMany({
      userId,
      generation: revision.generation,
      collection: record.collection,
      id: record.id,
      sequence: { $lt: record.sequence },
    });
  }
}

async function importedIdsToPrune(
  userId: string,
  affectedIds: string[],
  replacement: boolean,
) {
  if (!replacement) return new Set(affectedIds);
  const { records } = await graphCollections();
  return new Set(await records.distinct("id", { userId, imported: true }));
}

async function prunePreviousImportedGenerations(
  userId: string,
  revision: GraphRevision,
) {
  const { records } = await graphCollections();
  await records.deleteMany({
    userId,
    imported: true,
    generation: { $ne: revision.generation },
    sequence: { $lt: revision.sequence },
  });
}

async function removeLegacyImportedEvents(userId: string) {
  const database = await getMongoDatabase();
  const legacyEvents = await database.collection("nodes").find({
    userId,
    "node.type": "event",
    "node.properties.externalOrigin.kind": "calendar",
  }).toArray();
  if (!legacyEvents.length) return;

  const eventIds = legacyEvents.map((entry) => entry.node.id);
  const revisionIds = legacyEvents.map((entry) => entry._id);
  await database.collection("edges").updateMany(
    { userId },
    [{
      $set: {
        nodeRevisionIds: {
          $setDifference: ["$nodeRevisionIds", revisionIds],
        },
        edges: {
          $filter: {
            input: "$edges",
            as: "edge",
            cond: { $not: [{ $in: ["$$edge.sourceId", eventIds] }] },
          },
        },
      },
    }],
  );
  await database.collection("nodes").deleteMany({
    userId,
    _id: { $in: revisionIds },
  });
}

export async function pruneImportedHistory(
  userId: string,
  revision: GraphRevision,
  affectedIds: string[],
  replacement: boolean,
) {
  if (!affectedIds.length && !replacement) return;
  const idsToPrune = await importedIdsToPrune(
    userId,
    affectedIds,
    replacement,
  );
  await pruneCurrentGeneration(userId, revision, idsToPrune);
  await prunePreviousImportedGenerations(userId, revision);
  await removeLegacyImportedEvents(userId);
}
