import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import type {
  FlatTask,
  Graph,
  TaskNode,
  TaskPlacement,
} from "./graph";
import type { ScheduleMode } from "./preferences";

export type DragMode = "move" | "start" | "end";

export type DragState = {
  pointerId: number;
  taskId: string;
  mode: DragMode;
  originX: number;
  originGraph: Graph;
  lastAmount: number;
};

export type TaskColumnResizeDragState = {
  pointerId: number;
  originX: number;
  originWidth: number;
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
  scheduleMode: ScheduleMode;
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
  scheduleMode: ScheduleMode;
  days: string[];
  today: string;
  rangeStart: string;
  selectedId: string | null;
  hideDone: boolean;
  taskColumnWidth: number;
  collapsedIds: ReadonlySet<string>;
  onGraphChange: (graph: Graph) => void;
  onCollapsedIdsChange: (ids: Set<string>) => void;
  onTaskColumnWidthChange: (width: number) => void;
  onSelect: (taskId: string) => void;
  onNameChange: (taskId: string, value: string) => void;
  onAddChild: (parentId: string) => void;
  onCreate: () => void;
};

export type TaskInspectorProps = {
  selectedId: string | null;
  scheduleMode: ScheduleMode;
  helpText?: string;
  onDeleted: () => void;
};

export type TaskScheduleFieldsProps = {
  task: TaskNode;
  scheduleMode: ScheduleMode;
  helpText: string;
};

export type TimelineTaskRowProps = FlatTask & {
  graph: Graph;
  days: string[];
  rangeStart: string;
  today: string;
  selected: boolean;
  hasChildren: boolean;
  schedulingDisabled: boolean;
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
