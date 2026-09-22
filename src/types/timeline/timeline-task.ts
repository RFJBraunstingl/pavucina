import type { KeyboardEvent, PointerEvent } from "react";

import type {
  FlatTask,
  Graph,
  TaskNode,
  TaskPlacement,
} from "@/types/graph/graph";
import type { ScheduleMode } from "@/types/preferences/preferences";
import type { DragMode } from "./timeline-interaction";

export type TaskInspectorProps = {
  selectedId: string | null;
  scheduleMode: ScheduleMode;
  scheduleDate?: string;
  helpText?: string;
  onDeleted: () => void;
};

export type TaskDeleteControlProps = {
  taskName: string;
  onDelete: () => void;
};

export type TaskScheduleFieldsProps = {
  task: TaskNode;
  scheduleMode: ScheduleMode;
  scheduleDate?: string;
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
  collapseLocked: boolean;
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

export type TaskRowLabelProps = Pick<
  TimelineTaskRowProps,
  | "task"
  | "depth"
  | "hasChildren"
  | "collapsed"
  | "collapseLocked"
  | "onSelect"
  | "onNameChange"
  | "onToggle"
  | "onAddChild"
  | "onOrderStart"
  | "onOrderMove"
  | "onOrderEnd"
  | "onOrderCancel"
  | "onOrderKey"
>;

export type TaskScheduleBarProps = Pick<
  TimelineTaskRowProps,
  | "task"
  | "schedulingDisabled"
  | "onDragStart"
  | "onPointerMove"
  | "onPointerEnd"
  | "onArrow"
> & {
  start: string;
  end: string;
  startOffset: number;
  endOffset: number;
  visibleStart: number;
  visibleEnd: number;
  dayCount: number;
  scheduleHint?: string;
};
