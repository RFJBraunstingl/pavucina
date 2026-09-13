import type { Collection } from "mongodb";
import type { EdgeVersionDocument, NodeRevisionDocument } from "../types/graph-storage.ts";

export async function purgeHistoricalEvents(
  edges: Collection<EdgeVersionDocument>,
  nodes: Collection<NodeRevisionDocument>,
  userId: string,
) {
  const latest = await edges.findOne({ userId }, { sort: { createdAt: -1, _id: -1 } });
  if (!latest) return;
  const revisions = await nodes.find({
    userId, "node.type": "event", "node.properties.externalOrigin.kind": "calendar",
  }).toArray();
  if (!revisions.length) return;
  const revisionIds = revisions.map(({ _id }) => _id);
  const historicalVersions = await edges.find(
    {
      userId,
      nodeRevisionIds: { $in: revisionIds },
      $or: [
        { createdAt: { $lt: latest.createdAt } },
        { createdAt: latest.createdAt, _id: { $lt: latest._id } },
      ],
    },
    { projection: { _id: 1, nodeRevisionIds: 1 } },
  ).toArray();
  if (!historicalVersions.length) return;
  const eventIds = [...new Set(revisions.map(({ node }) => node.id))];
  const historicalRevisionIds = new Set(
    historicalVersions.flatMap(({ nodeRevisionIds }) => nodeRevisionIds),
  );
  await edges.updateMany(
    { userId, _id: { $in: historicalVersions.map(({ _id }) => _id) } },
    [{
      $set: {
        nodeRevisionIds: { $setDifference: ["$nodeRevisionIds", revisionIds] },
        edges: {
          $filter: {
            input: "$edges",
            as: "edge",
            cond: {
              $and: [
                { $not: [{ $in: ["$$edge.sourceId", eventIds] }] },
                { $not: [{ $in: ["$$edge.targetId", eventIds] }] },
              ],
            },
          },
        },
      },
    }],
  );
  const retainedRevisionIds = new Set(latest.nodeRevisionIds);
  const obsoleteIds = revisionIds.filter((id) =>
    historicalRevisionIds.has(id) && !retainedRevisionIds.has(id));
  if (obsoleteIds.length) await nodes.deleteMany({ userId, _id: { $in: obsoleteIds } });
}
