import type { PointerEvent, RefObject } from "react";

import type { CalendarItem } from "./calendar";
import type { Graph, TaskNode } from "./graph";
import type { ScheduleMode } from "./preferences";

export type DayScheduleEvent = CalendarItem;

export type DayScheduleTask = {
  task: TaskNode;
  startDate: string;
  endDate: string;
};

export type DaySchedule = {
  events: DayScheduleEvent[];
  unscheduled: DayScheduleTask[];
};

export type ScheduleTrayDay = {
  date: string;
  tasks: DayScheduleTask[];
};

export type ScheduleGridProps = {
  graph: Graph;
  scheduleMode: ScheduleMode;
  days: string[];
  today: string;
  events: DayScheduleEvent[];
  selectedId: string | null;
  bodyRef: RefObject<HTMLDivElement | null>;
  onGraphChange: (graph: Graph) => void;
  onSelect: (taskId: string, date: string) => void;
};

export type ScheduleTrayProps = {
  days: ScheduleTrayDay[];
  overdue: DayScheduleTask[];
  selectedId: string | null;
  selectedDate: string;
  onSelect: (taskId: string, date: string) => void;
  onDragStart: (
    event: PointerEvent<HTMLButtonElement>,
    task: TaskNode,
    date: string,
  ) => void;
  onDragMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragCancel: (event: PointerEvent<HTMLButtonElement>) => void;
};

export type TrayScheduleOptions = {
  days: string[];
  bodyRef: RefObject<HTMLDivElement | null>;
  onSchedule: (
    taskId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) => void;
  onSelect: (taskId: string, date: string) => void;
};
