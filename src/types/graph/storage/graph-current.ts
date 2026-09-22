import type { GraphRecord } from "../graph-sync";

export type GraphCurrentRecordDocument = GraphRecord & {
  _id: string;
  kind: "record";
  userId: string;
  generation: string;
  sequence: number;
};

export type GraphCurrentHeadDocument = {
  _id: string;
  kind: "head";
  userId: string;
  generation: string;
  sequence: number;
};

export type GraphCurrentDocument =
  | GraphCurrentRecordDocument
  | GraphCurrentHeadDocument;
