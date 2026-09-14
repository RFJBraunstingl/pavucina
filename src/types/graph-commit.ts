import type { GraphRecord } from "./graph-sync";

export type GraphCommit = {
  _id: string; userId: string; generation: string; sequence: number;
  mutationId: string; digest: string; createdAt: Date;
};
export type GraphRecordRevision = GraphRecord & {
  _id: string; userId: string; generation: string; sequence: number;
  attemptId: string; imported: boolean; createdAt: Date;
};
