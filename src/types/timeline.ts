import type { KeyboardEvent, PointerEvent } from "react";

import type {
  DateRelationshipType,
  FlatTask,
  Graph,
  TaskNode,
} from "./graph";

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
  onCreate: () => void;
};

export type TaskInspectorProps = {
  graph: Graph;
  selected?: TaskNode;
  onDelete: (taskId: string) => void;
  onNameChange: (taskId: string, value: string) => void;
  onDateChange: (
    taskId: string,
    type: DateRelationshipType,
    value: string,
  ) => void;
};

export type TimelineTaskRowProps = FlatTask & {
  graph: Graph;
  days: string[];
  rangeStart: string;
  today: string;
  selected: boolean;
  onSelect: (taskId: string) => void;
  onAddChild: (parentId: string) => void;
  onSchedule: (taskId: string, day: string) => void;
  onDragStart: (
    event: PointerEvent<HTMLButtonElement>,
    taskId: string,
    mode: DragMode,
  ) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLButtonElement>) => void;
  onArrow: (
    event: KeyboardEvent<HTMLButtonElement>,
    taskId: string,
    mode: DragMode,
  ) => void;
};
