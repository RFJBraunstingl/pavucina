import type {
  KeyboardEventHandler,
  PointerEventHandler,
} from "react";

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

export type CalendarDragState = {
  pointerId: number;
  taskId: string;
  originX: number;
  originY: number;
  originGraph: Graph;
  startDayIndex: number;
  startTime: string;
  lastTarget: string;
};

export type CalendarGridProps = {
  graph: Graph;
  days: string[];
  today: string;
  onGraphChange: (graph: Graph) => void;
};

export type CalendarEventProps = {
  item: CalendarItem;
  onPointerDown: PointerEventHandler<HTMLButtonElement>;
  onPointerMove: PointerEventHandler<HTMLButtonElement>;
  onPointerEnd: PointerEventHandler<HTMLButtonElement>;
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
};
