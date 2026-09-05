import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import type { Graph, TaskNode } from "./graph";
import type { ScheduleMode } from "./preferences";

export type CalendarItem = {
  task: TaskNode;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  dayIndex: number;
  top: number;
  height: number;
};

export type CalendarResizeEdge = "start" | "end";
export type CalendarDragMode = "move" | CalendarResizeEdge;

export type CalendarDragState = {
  pointerId: number;
  taskId: string;
  mode: CalendarDragMode;
  originX: number;
  originY: number;
  originGraph: Graph;
  startDayIndex: number;
  startTime: string;
  endTime: string;
  lastTarget: string;
};

export type CalendarGridProps = {
  graph: Graph;
  scheduleMode: ScheduleMode;
  days: string[];
  today: string;
  hideDone: boolean;
  selectedId: string | null;
  onGraphChange: (graph: Graph) => void;
  onSelect: (taskId: string) => void;
};

export type CalendarInteractionOptions = {
  graph: Graph;
  scheduleMode: ScheduleMode;
  days: string[];
  bodyRef: RefObject<HTMLDivElement | null>;
  onGraphChange: (graph: Graph) => void;
  onSelect: (taskId: string) => void;
};

export type CalendarEventProps = {
  item: CalendarItem;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (
    event: PointerEvent<HTMLButtonElement>,
    mode: CalendarDragMode,
  ) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    mode: CalendarDragMode,
  ) => void;
};
