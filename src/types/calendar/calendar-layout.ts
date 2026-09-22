import type { TaskNode } from "@/types/graph/graph";
import type { EventNode } from "./events/event";
import type { ExternalCalendarEvent } from "./events/external-calendar";

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
export type GraphCalendarItem = CalendarLayoutItem & { eventNode: EventNode };
export type EditableCalendarItem = CalendarItem | GraphCalendarItem;
export type CalendarDisplayItem =
  | CalendarItem
  | ExternalCalendarItem
  | GraphCalendarItem;
