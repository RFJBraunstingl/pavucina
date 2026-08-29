export type TimeProperty = "plannedStartTime" | "plannedEndTime";

export type TaskProperties = {
  name: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
};

export type TaskNode = {
  id: string;
  type: "task";
  properties: TaskProperties;
};

export type DateNode = {
  id: string;
  type: "date";
  properties: { value: string };
};

export type GraphNode = TaskNode | DateNode;
export type DateRelationshipType = "plannedStartDate" | "plannedEndDate";
export type RelationshipType = "child" | DateRelationshipType;

export type Relationship = {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
};

export type Graph = {
  version: 1;
  nodes: GraphNode[];
  relationships: Relationship[];
};

export type FlatTask = { task: TaskNode; depth: number };
