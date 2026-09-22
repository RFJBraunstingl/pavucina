import type { ObjectId } from "mongodb";

import type { GraphNode, Relationship } from "../graph";

export type NodeRevisionDocument = {
  _id: string;
  userId: string;
  node: GraphNode;
};

export type EdgeVersionDocument = {
  _id: ObjectId;
  userId: string;
  createdAt: Date;
  graphSchemaVersion: 1;
  nodeRevisionIds: string[];
  inboxNodeRevisionIds: string[];
  edges: Relationship[];
};
