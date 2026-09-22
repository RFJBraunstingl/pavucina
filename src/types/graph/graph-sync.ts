import type { GraphNode, Relationship } from "./graph";

export type GraphCollection = "nodes" | "relationships" | "inboxNodes";
export type GraphEntity = GraphNode | Relationship;
export type FieldChange = {
  before?: unknown;
  after?: unknown;
};

type GraphOperationTarget = {
  collection: GraphCollection;
  id: string;
};

export type GraphOperation = GraphOperationTarget & (
  | {
      kind: "create";
      value: GraphEntity;
      afterId: string | null;
    }
  | {
      kind: "update";
      fields: Record<string, FieldChange>;
    }
  | {
      kind: "delete";
      before: GraphEntity;
    }
  | {
      kind: "move";
      beforeId: string | null;
      afterId: string | null;
    }
);

export type GraphRevision = {
  generation: string;
  sequence: number;
};

export type GraphPatch = {
  mutationId: string;
  baseRevision: GraphRevision;
  operations: GraphOperation[];
};

export type GraphRecord = {
  collection: GraphCollection;
  id: string;
  value?: GraphEntity;
  order: number;
  deleted?: boolean;
};

export type GraphSnapshot = {
  revision: GraphRevision;
  records: GraphRecord[];
};

export type GraphChanges = GraphSnapshot & {
  nextOffset: number | null;
};

export type SyncConflict = {
  id: string;
  field: string;
  mine?: unknown;
  saved?: unknown;
};
