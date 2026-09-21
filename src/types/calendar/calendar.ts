import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  RefObject,
} from "react";

import type { Graph, TaskNode } from "@/types/graph/graph";
import type { ExternalCalendarEvent } from "./external-calendar";
import type { ScheduleMode } from "@/types/preferences/preferences";
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
export type EditableCalendarItem = CalendarItem | ImportedCalendarItem;
export type CalendarDisplayItem =
  | CalendarItem
  | ExternalCalendarItem
  | ImportedCalendarItem;

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

export type CalendarGridItemsProps = Pick<
  CalendarGridProps,
  "graph" | "selectedId" | "locked" | "onSelect" | "onSelectEvent"
> & {
  items: CalendarDisplayItem[];
  dayCount: number;
  schedule: CalendarScheduleHandlers;
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
};

export type CalendarToolbarProps = CalendarRangeControlsProps & {
  days: string[];
  controls: ReactNode;
};

export type CalendarGridBackgroundProps = {
  days: string[];
  currentTimePosition?: CSSProperties | null;
};

export type CalendarCreatePreviewProps = {
  preview: EventTimeRange;
  days: string[];
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

export type CalendarEventProps = {
  item: EditableCalendarItem;
  selected: boolean;
  locked: boolean;
  dayCount?: number;
  onSelect: () => void;
  onOpen?: () => void;
  resizeStart?: boolean;
  resizeEnd?: boolean;
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
