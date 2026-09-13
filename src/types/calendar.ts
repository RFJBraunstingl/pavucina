import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import type { Graph, TaskNode } from "./graph";
import type { ExternalCalendarEvent } from "./external-calendar";
import type { ScheduleMode } from "./preferences";
import type { EventNode, EventTimeRange } from "./event";

export type CalendarLayoutItem = {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  dayIndex: number;
  laneIndex: number;
  laneCount: number;
  top: number;
  height: number;
};

export type CalendarItem = CalendarLayoutItem & { task: TaskNode };
export type ExternalCalendarItem = CalendarLayoutItem & {
  event: ExternalCalendarEvent & { allDay: false };
};
export type ImportedCalendarItem = CalendarLayoutItem & { eventNode: EventNode };

export type GraphCalendarEventProps = {
  item: ImportedCalendarItem;
  dayCount?: number;
  selected: boolean;
  onSelect: () => void;
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
  taskEvents: CalendarItem[];
  externalEvents: ExternalCalendarEvent[];
  graphEvents: EventNode[];
  selectedId: string | null;
  locked: boolean;
  bodyRef: RefObject<HTMLDivElement | null>;
  onGraphChange: (graph: Graph) => void;
  onSelect: (taskId: string, date: string) => void;
  onSelectEvent: (eventId: string) => void;
  onCreateEvent: (range: EventTimeRange) => void;
  creating: boolean;
};

export type CalendarRangeControlsProps = {
  day: string;
  today: string;
  dayCount: number;
  locked: boolean;
  hideDone: boolean;
  onToggleLock: () => void;
  onHideDone: (hidden: boolean) => void;
  onShowDay: (date: string) => void;
  onCreate: () => void;
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
};

export type CalendarEventProps = {
  item: CalendarItem;
  selected: boolean;
  locked: boolean;
  dayCount?: number;
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
