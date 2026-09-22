import { useRef, useState } from "react";

import { useTraySchedule } from "../scheduling/use-tray-schedule";
import { scheduleTaskForDay } from "@/services/task/scheduling/day/task-day-schedule-service";
import type { CalendarTaskSchedulingOptions } from "@/types/calendar/calendar-interaction";

export function useCalendarTaskScheduling({
  today,
  days,
  locked,
  onGraphChange,
}: CalendarTaskSchedulingOptions) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(today);
  const bodyRef = useRef<HTMLDivElement>(null);

  function selectTask(taskId: string, date: string) {
    setSelectedId(taskId);
    setScheduleDate(date);
  }

  function scheduleTask(
    taskId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    onGraphChange((graph) =>
      graph
        ? scheduleTaskForDay(graph, taskId, date, startTime, endTime)
        : graph,
    );
  }

  const tray = useTraySchedule({
    days,
    bodyRef,
    locked,
    onSelect: selectTask,
    onSchedule: scheduleTask,
  });

  function showDate(date: string) {
    setScheduleDate(date);
    setSelectedId(null);
  }

  return {
    selectedId,
    scheduleDate,
    bodyRef,
    tray,
    selectTask,
    setSelectedId,
    showDate,
  };
}
