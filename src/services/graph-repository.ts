import "server-only";

import { ObjectId, type Collection } from "mongodb";

import { createNodeRevisionPlan } from "./graph-version-service";
import { getMongoDatabase } from "./mongodb";
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
    edges.createIndex({ userId: 1, createdAt: -1, _id: -1 }),
    edges.createIndex({ userId: 1, "edges.id": 1 }),
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
  return new Map(revisions.map((revision) => [revision._id, revision]));
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
  return versionId.toHexString();
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
