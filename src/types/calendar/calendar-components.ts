import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  RefObject,
} from "react";

import type { Graph } from "@/types/graph/graph";
import type { ScheduleMode } from "@/types/preferences/preferences";
import type { EventNode, EventTimeRange } from "./events/event";
import type { ExternalCalendarEvent } from "./events/external-calendar";
import type {
  CalendarDisplayItem,
  CalendarItem,
  EditableCalendarItem,
  GraphCalendarItem,
} from "./calendar-layout";
import type { CalendarDragMode, CalendarScheduleHandlers } from "./calendar-interaction";

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

export type CalendarGridItemsProps = Pick<
  CalendarGridProps,
  "graph" | "selectedId" | "locked" | "onSelect" | "onSelectEvent"
> & {
  items: CalendarDisplayItem[];
  dayCount: number;
  schedule: CalendarScheduleHandlers;
};

export type GraphCalendarEventProps = {
  item: GraphCalendarItem;
  dayCount?: number;
  selected: boolean;
  onSelect: () => void;
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
