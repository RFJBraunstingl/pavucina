import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import type {
  DateRelationshipType,
  FlatTask,
  Graph,
  TaskPlacement,
  TaskNode,
  TimeProperty,
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

export type TaskOrderDragState = {
  pointerId: number;
  taskId: string;
  originY: number;
};

export type TaskDropTarget = {
  targetId: string;
  indicatorId: string;
  placement: TaskPlacement;
};

export type TaskDropPreview = TaskDropTarget & {
  graph: Graph;
};

export type TimelineInteractionOptions = {
  graph: Graph;
  onGraphChange: (graph: Graph) => void;
  onSelect: (taskId: string) => void;
};

export type TaskOrderOptions = TimelineInteractionOptions & {
  tasks: FlatTask[];
  scrollRef: RefObject<HTMLDivElement | null>;
  onExpand: (taskId: string) => void;
};

export type TimelineGridProps = {
  graph: Graph;
  days: string[];
  today: string;
  rangeStart: string;
  selectedId: string | null;
  hideDone: boolean;
  collapsedIds: ReadonlySet<string>;
  onGraphChange: (graph: Graph) => void;
  onCollapsedIdsChange: (ids: Set<string>) => void;
  onSelect: (taskId: string) => void;
  onNameChange: (taskId: string, value: string) => void;
  onAddChild: (parentId: string) => void;
  onCreate: () => void;
};

export type TaskInspectorProps = {
  graph: Graph;
  selected?: TaskNode;
  onDelete: (taskId: string) => void;
  onDoneChange: (taskId: string, done: boolean) => void;
  onDescriptionChange: (taskId: string, value: string) => void;
  onNameChange: (taskId: string, value: string) => void;
  onDateChange: (
    taskId: string,
    type: DateRelationshipType,
    value: string,
  ) => void;
  onTimeChange: (taskId: string, type: TimeProperty, value: string) => void;
};

export type TimelineTaskRowProps = FlatTask & {
  graph: Graph;
  days: string[];
  rangeStart: string;
  today: string;
  selected: boolean;
  hasChildren: boolean;
  collapsed: boolean;
  ordering: boolean;
  dropPlacement?: TaskPlacement;
  onSelect: (taskId: string) => void;
  onNameChange: (taskId: string, value: string) => void;
  onToggle: (taskId: string) => void;
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
  onOrderStart: (
    event: PointerEvent<HTMLButtonElement>,
    taskId: string,
  ) => void;
  onOrderMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onOrderEnd: (event: PointerEvent<HTMLButtonElement>) => void;
  onOrderCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onOrderKey: (
    event: KeyboardEvent<HTMLButtonElement>,
    taskId: string,
  ) => void;
};
