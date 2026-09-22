import "server-only";

import { type Collection } from "mongodb";

import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import type { Graph, TaskNode } from "@/types/graph/graph";
import type {
  EdgeVersionDocument,
  NodeRevisionDocument,
} from "@/types/graph/storage/graph-storage";

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
  return new Map(revisions.map((revision) => [revision._id, revision]));
}

export async function loadLegacyGraph(userId: string): Promise<Graph | null> {
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
