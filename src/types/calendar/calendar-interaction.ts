import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import type { Graph } from "@/types/graph/graph";
import type { ScheduleMode } from "@/types/preferences/preferences";
import type { EventTimeRange } from "./events/event";
import type { CalendarLayoutItem, EditableCalendarItem } from "./calendar-layout";

export type CalendarResizeEdge = "start" | "end";
export type CalendarDragMode = "move" | CalendarResizeEdge;

export type CalendarDragState = {
  pointerId: number;
  item: EditableCalendarItem;
  mode: CalendarDragMode;
  originX: number;
  originY: number;
  originGraph: Graph;
  startDayIndex: number;
  startTime: string;
  lastTarget: string;
  moved: boolean;
};

export type CalendarScheduleHandlers = {
  beginDrag: (
    event: PointerEvent<HTMLButtonElement>,
    item: EditableCalendarItem,
    mode: CalendarDragMode,
  ) => void;
  continueDrag: (event: PointerEvent<HTMLElement>) => void;
  endDrag: (event: PointerEvent<HTMLElement>) => void;
  handleArrow: (
    event: KeyboardEvent<HTMLButtonElement>,
    item: EditableCalendarItem,
    mode: CalendarDragMode,
  ) => void;
};

export type CalendarCreationOptions = {
  items: CalendarLayoutItem[];
  days: string[];
  locked: boolean;
  creating: boolean;
  bodyRef: RefObject<HTMLDivElement | null>;
  onCreate: (range: EventTimeRange) => void;
};

export type CalendarPreview = {
  range: EventTimeRange;
  items: CalendarLayoutItem[];
  days: string[];
};

export type CalendarPointerOrigin = { x: number; y: number };

export type CalendarInteractionOptions = {
  graph: Graph;
  scheduleMode: ScheduleMode;
  days: string[];
  bodyRef: RefObject<HTMLDivElement | null>;
  onGraphChange: (graph: Graph) => void;
  onSelect: (taskId: string, date: string) => void;
  onOpenEvent: (eventId: string) => void;
  locked: boolean;
};
