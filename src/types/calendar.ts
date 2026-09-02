import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import type { Graph, TaskNode } from "./graph";

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
  days: string[];
  today: string;
  onGraphChange: (graph: Graph) => void;
};

export type CalendarInteractionOptions = {
  graph: Graph;
  days: string[];
  bodyRef: RefObject<HTMLDivElement | null>;
  onGraphChange: (graph: Graph) => void;
};

export type CalendarEventProps = {
  item: CalendarItem;
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
