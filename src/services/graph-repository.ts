import "server-only";

import { ObjectId, type Collection } from "mongodb";

import { createNodeRevisionPlan } from "./graph-version-service";
import { getMongoDatabase } from "./mongodb";
import { normalizeStoredEventNode } from "../utils/event";
import type { Graph, TaskNode } from "@/types/graph";
import type {
  EdgeVersionDocument,
  NodeRevisionDocument,
} from "@/types/graph-storage";

let indexesPromise: Promise<unknown> | undefined;

async function collections() {
  const database = await getMongoDatabase();
  const edges = database.collection<EdgeVersionDocument>("edges");
  const nodes = database.collection<NodeRevisionDocument>("nodes");
  indexesPromise ??= Promise.all([
    nodes.createIndex({ userId: 1, "node.id": 1 }),
    nodes.createIndex({ userId: 1, "node.type": 1 }),
    edges.createIndex({ userId: 1, createdAt: -1, _id: -1 }),
    edges.createIndex({ userId: 1, "edges.id": 1 }),
    edges.createIndex({ userId: 1, nodeRevisionIds: 1 }),
  ]).catch((error) => {
    indexesPromise = undefined;
    throw error;
  });
  await indexesPromise;
  return { edges, nodes };
}

async function latestVersion(
  edges: Collection<EdgeVersionDocument>,
  userId: string,
) {
  return edges.findOne({ userId }, { sort: { createdAt: -1, _id: -1 } });
}

async function revisionMap(
  nodes: Collection<NodeRevisionDocument>,
  userId: string,
  revisionIds: string[],
) {
  if (!revisionIds.length) return new Map<string, NodeRevisionDocument>();
  const revisions = await nodes
    .find({ userId, _id: { $in: revisionIds } })
    .toArray();
  if (revisions.length !== revisionIds.length) {
    throw new Error("Graph version references missing node revisions");
  }
  return new Map(revisions.map((revision) => [revision._id, {
    ...revision,
    node: normalizeStoredEventNode(revision.node),
  }]));
}

export async function loadLatestGraph(userId: string): Promise<Graph | null> {
  const { edges, nodes } = await collections();
  const version = await latestVersion(edges, userId);
  if (!version) return null;

  const revisionIds = [
    ...version.nodeRevisionIds,
    ...version.inboxNodeRevisionIds,
  ];
  const revisions = await revisionMap(nodes, userId, revisionIds);
  return {
    version: version.graphSchemaVersion,
    nodes: version.nodeRevisionIds.map((id) => revisions.get(id)!.node),
    relationships: version.edges,
    inboxNodes: version.inboxNodeRevisionIds.map(
      (id) => revisions.get(id)!.node as TaskNode,
    ),
  };
}

async function writeGraphVersion(
  userId: string,
  graph: Graph,
  previousRevisions: Map<string, NodeRevisionDocument>,
) {
  const { edges, nodes } = await collections();
  const mainPlan = createNodeRevisionPlan(
    userId,
    graph.nodes,
    previousRevisions.values(),
  );
  const inboxPlan = createNodeRevisionPlan(
    userId,
    graph.inboxNodes ?? [],
    previousRevisions.values(),
  );
  const inserted = [...mainPlan.inserted, ...inboxPlan.inserted];
  if (inserted.length) await nodes.insertMany(inserted);

  const versionId = new ObjectId();
  await edges.insertOne({
    _id: versionId,
    userId,
    createdAt: new Date(),
    graphSchemaVersion: graph.version,
    nodeRevisionIds: mainPlan.nodeRevisionIds,
    inboxNodeRevisionIds: inboxPlan.nodeRevisionIds,
    edges: graph.relationships,
  });
  await purgeHistoricalEvents(edges, nodes, userId);
  return versionId.toHexString();
}

async function purgeHistoricalEvents(
  edges: Collection<EdgeVersionDocument>,
  nodes: Collection<NodeRevisionDocument>,
  userId: string,
) {
  const latest = await latestVersion(edges, userId);
  if (!latest) return;
  const revisions = await nodes.find({ userId, "node.type": "event" }).toArray();
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

export async function saveGraphVersion(userId: string, graph: Graph) {
  const { edges, nodes } = await collections();
  const previousVersion = await latestVersion(edges, userId);
  const previousIds = previousVersion
    ? [
        ...previousVersion.nodeRevisionIds,
        ...previousVersion.inboxNodeRevisionIds,
      ]
    : [];
  const previousRevisions = await revisionMap(nodes, userId, previousIds);
  return writeGraphVersion(userId, graph, previousRevisions);
}

export function restoreGraphVersion(userId: string, graph: Graph) {
  return writeGraphVersion(userId, graph, new Map());
}
