import type { DateRelationshipType, Graph, TaskNode } from "./graph";

export type DragMode = "move" | "start" | "end";

export type DragState = {
  pointerId: number;
  taskId: string;
  mode: DragMode;
  originX: number;
  originGraph: Graph;
  lastAmount: number;
};

export type TimelineGridProps = {
  graph: Graph;
  days: string[];
  today: string;
  rangeStart: string;
  selectedId: string | null;
  onGraphChange: (graph: Graph) => void;
  onSelect: (taskId: string) => void;
  onAddChild: (parentId: string) => void;
};

export type TaskInspectorProps = {
  graph: Graph;
  selected?: TaskNode;
  onNameChange: (taskId: string, value: string) => void;
  onDateChange: (
    taskId: string,
    type: DateRelationshipType,
    value: string,
  ) => void;
};
