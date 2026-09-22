import type { KeyboardEvent, PointerEvent } from "react";

import { useCalendarCreation } from "./use-calendar-creation";
import { useCalendarSchedule } from "./use-calendar-schedule";
import { defaultCalendarEvent } from "@/utils/calendar/calendar-creation";
import type { CalendarGridInteractionOptions } from "@/types/calendar/calendar-interaction";

export function useCalendarGridInteractions({
  items,
  today,
  creating,
  onCreate,
  ...scheduleOptions
}: CalendarGridInteractionOptions) {
  const { days, locked, bodyRef } = scheduleOptions;
  const creation = useCalendarCreation({
    items,
    days,
    locked,
    creating,
    bodyRef,
    onCreate,
  });
  const schedule = useCalendarSchedule(scheduleOptions);

  function createAllDayEvent(date: string) {
    onCreate({ ...defaultCalendarEvent(items, date), allDay: true });
  }

  function createEventWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const bodyFocused = event.target === event.currentTarget;
    if (event.key !== "Enter" || !bodyFocused || event.repeat || locked || creating) {
      return;
    }
    event.preventDefault();
    const date = days.includes(today) ? today : days[0];
    onCreate(defaultCalendarEvent(items, date));
  }

  function continuePointerInteraction(event: PointerEvent<HTMLDivElement>) {
    schedule.continueDrag(event);
    creation.move(event);
  }

  function cancelPointerInteraction(event: PointerEvent<HTMLDivElement>) {
    schedule.endDrag(event);
    creation.clear();
  }

  return {
    creation,
    schedule,
    createAllDayEvent,
    createEventWithKeyboard,
    continuePointerInteraction,
    cancelPointerInteraction,
  };
}
