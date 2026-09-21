import type { MailTaskOrigin } from "@/types/mailbox/mailbox";
import type { EventNode } from "@/types/calendar/event";

export type TimeProperty = "plannedStartTime" | "plannedEndTime";

export type TaskProperties = {
  name: string;
  description?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  mailOrigin?: MailTaskOrigin;
};

export type TaskNode = {
  id: string;
  type: "task";
  properties: TaskProperties;
};

export type RootNode = {
  id: string;
  type: "root";
  properties: Record<string, never>;
};

export type DateNode = {
  id: string;
  type: "date";
  properties: { value: string };
};

export type GraphNode = RootNode | TaskNode | DateNode | EventNode;
export type DateRelationshipType = "plannedStartDate" | "plannedEndDate";
export type EventDateRelationshipType = "eventStartDate" | "eventEndDate";
export type CompletionRelationshipType =
  | "markedAsDone"
  | "wasMarkedAsDone"
  | "markedAsReopened";
export type RelationshipType =
  | "child"
  | DateRelationshipType
  | EventDateRelationshipType
  | CompletionRelationshipType;
export type TaskPlacement = "before" | "inside" | "after";

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
  inboxNodes?: TaskNode[];
};

export type FlatTask = { task: TaskNode; depth: number };
