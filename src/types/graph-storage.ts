import type { ObjectId } from "mongodb";

import type { GraphNode, Relationship } from "./graph";

export type NodeRevisionDocument = {
  _id: string;
  node: GraphNode;
};

export type GraphVersionDocument = {
  _id: ObjectId;
  createdAt: Date;
  graphSchemaVersion: 1;
  nodeRevisionIds: string[];
  relationships: Relationship[];
};
