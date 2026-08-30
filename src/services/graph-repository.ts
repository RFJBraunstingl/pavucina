import "server-only";

import { ObjectId, type Collection } from "mongodb";

import { createNodeRevisionPlan } from "./graph-version-service";
import { getMongoDatabase } from "./mongodb";
import type { Graph } from "@/types/graph";
import type {
  GraphVersionDocument,
  NodeRevisionDocument,
} from "@/types/graph-storage";

const indexPromises = new Map<string, Promise<string>>();

function collectionNames(githubId: string) {
  if (!/^[0-9a-fA-F\-]+$/.test(githubId)) throw new Error("Invalid GitHub user ID");
  return {
    versions: `github_${githubId}_graph_versions`,
    nodes: `github_${githubId}_nodes`,
  };
}

async function collections(githubId: string) {
  const database = await getMongoDatabase();
  const names = collectionNames(githubId);
  const versions = database.collection<GraphVersionDocument>(names.versions);
  const nodes = database.collection<NodeRevisionDocument>(names.nodes);
  let index = indexPromises.get(names.versions);
  if (!index) {
    index = versions.createIndex({ createdAt: -1, _id: -1 }).catch((error) => {
      indexPromises.delete(names.versions);
      throw error;
    });
    indexPromises.set(names.versions, index);
  }
  await index;
  return { versions, nodes };
}

async function latestVersion(versions: Collection<GraphVersionDocument>) {
  return versions.findOne({}, { sort: { createdAt: -1, _id: -1 } });
}

async function revisionMap(
  nodes: Collection<NodeRevisionDocument>,
  revisionIds: string[],
) {
  const revisions = await nodes.find({ _id: { $in: revisionIds } }).toArray();
  if (revisions.length !== revisionIds.length) {
    throw new Error("Graph version references missing node revisions");
  }
  return new Map(revisions.map((revision) => [revision._id, revision]));
}

export async function loadLatestGraph(githubId: string): Promise<Graph | null> {
  const { versions, nodes } = await collections(githubId);
  const version = await latestVersion(versions);
  if (!version) return null;

  const revisions = await revisionMap(nodes, version.nodeRevisionIds);
  return {
    version: version.graphSchemaVersion,
    nodes: version.nodeRevisionIds.map((id) => revisions.get(id)!.node),
    relationships: version.relationships,
  };
}

export async function saveGraphVersion(githubId: string, graph: Graph) {
  const { versions, nodes } = await collections(githubId);
  const previousVersion = await latestVersion(versions);
  const previousRevisions = previousVersion
    ? await revisionMap(nodes, previousVersion.nodeRevisionIds)
    : new Map<string, NodeRevisionDocument>();
  const { inserted, nodeRevisionIds } = createNodeRevisionPlan(
    graph,
    previousRevisions.values(),
  );
  if (inserted.length) await nodes.insertMany(inserted);

  const versionId = new ObjectId();
  await versions.insertOne({
    _id: versionId,
    createdAt: new Date(),
    graphSchemaVersion: graph.version,
    nodeRevisionIds,
    relationships: graph.relationships,
  });
  return versionId.toHexString();
}
