import type { PointerEvent, RefObject } from "react";

import type { TaskNode } from "@/types/graph/graph";
import type { CalendarItem } from "./calendar";

export type DayScheduleTask = {
  task: TaskNode;
  startDate: string;
  endDate: string;
};

export type DaySchedule = {
  events: CalendarItem[];
  unscheduled: DayScheduleTask[];
};

export type ScheduleTrayDay = {
  date: string;
  tasks: DayScheduleTask[];
};

export type ScheduleTrayProps = {
  days: ScheduleTrayDay[];
  overdue: DayScheduleTask[];
  selectedId: string | null;
  selectedDate: string;
  locked: boolean;
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
  locked: boolean;
  onSchedule: (
    taskId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) => void;
  onSelect: (taskId: string, date: string) => void;
};
