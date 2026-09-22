import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  RefObject,
} from "react";

import type {
  FlatTask,
  Graph,
  TaskPlacement,
} from "@/types/graph/graph";
import type { GraphUpdate } from "@/types/graph/graph-sync-controller";
import type { ScheduleMode } from "@/types/preferences/preferences";

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

export type TaskDropPreview = TaskDropTarget & { graph: Graph };

export type TimelineInteractionOptions = {
  graph: Graph;
  scheduleMode: ScheduleMode;
  onGraphChange: (graph: Graph) => void;
  onSelect: (taskId: string) => void;
};

export type TimelineTaskActionsOptions = {
  scheduleMode: ScheduleMode;
  onGraphChange: (update: GraphUpdate) => void;
  onSelect: (taskId: string) => void;
};

export type TaskOrderOptions = TimelineInteractionOptions & {
  tasks: FlatTask[];
  scrollRef: RefObject<HTMLDivElement | null>;
  onExpand: (taskId: string) => void;
};

export type TaskColumnResizeControls = {
  width: number;
  minWidth: number;
  maxWidth: number;
  style: CSSProperties;
  beginResize: (event: PointerEvent<HTMLDivElement>) => void;
  continueResize: (event: PointerEvent<HTMLDivElement>) => void;
  endResize: (event: PointerEvent<HTMLDivElement>) => void;
  resizeWithKeyboard: (event: KeyboardEvent<HTMLDivElement>) => void;
};
