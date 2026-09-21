import "server-only";
import { graphCollections, publishedRecords } from "./graph-commit-store";
import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import type { GraphRevision } from "@/types/graph/graph-sync";

export async function pruneImportedHistory(userId: string, revision: GraphRevision, affectedIds: string[], replacement: boolean) {
  if (!affectedIds.length && !replacement) return;
  const { records } = await graphCollections();
  const latest = await publishedRecords(userId, revision, true);
  const imported = replacement ? await records.distinct("id", { userId, imported: true }) : affectedIds;
  const ids = new Set(imported);
  for (const record of latest) {
    if (!ids.has(record.id)) continue;
    await records.deleteMany({ userId, generation: revision.generation, collection: record.collection, id: record.id,
      sequence: { $lt: (record as typeof record & { sequence: number }).sequence } });
  }
  // Old generations are retained for native history, never for provider payloads.
  await records.deleteMany({ userId, imported: true, generation: { $ne: revision.generation }, sequence: { $lt: revision.sequence } });
  const database = await getMongoDatabase();
  const legacy = await database.collection("nodes").find({ userId, "node.type": "event", "node.properties.externalOrigin.kind": "calendar" }).toArray();
  if (legacy.length) {
    const nodeIds = legacy.map((entry) => entry.node.id), revisionIds = legacy.map((entry) => entry._id);
    await database.collection("edges").updateMany({ userId }, [{ $set: {
      nodeRevisionIds: { $setDifference: ["$nodeRevisionIds", revisionIds] },
      edges: { $filter: { input: "$edges", as: "edge", cond: { $not: [{ $in: ["$$edge.sourceId", nodeIds] }] } } },
    } }]);
    await database.collection("nodes").deleteMany({ userId, _id: { $in: revisionIds } });
  }
}
