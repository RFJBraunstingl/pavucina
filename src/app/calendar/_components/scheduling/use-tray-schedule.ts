import { type PointerEvent, useRef } from "react";

import { taskDuration } from "@/services/task/scheduling/day/task-day-schedule-service";
import { droppedTimeRange } from "@/utils/calendar/day-schedule";
import type { TaskNode } from "@/types/graph/graph";
import type { TrayScheduleOptions } from "@/types/calendar/events/schedule";

export function useTraySchedule(props: TrayScheduleOptions) {
  const drag = useRef<{ pointerId: number; task: TaskNode } | null>(null);

  function beginDrag(
    event: PointerEvent<HTMLButtonElement>,
    task: TaskNode,
    date: string,
  ) {
    if (props.locked || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    props.onSelect(task.id, date);
    drag.current = { pointerId: event.pointerId, task };
  }

  function continueDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId === event.pointerId) event.preventDefault();
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    drag.current = null;
    const body = props.bodyRef.current;
    if (props.locked || !active || active.pointerId !== event.pointerId || !body) {
      return;
    }
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || !body.contains(target)) return;
    const bounds = body.getBoundingClientRect();
    if (
      event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom
    ) return;
    const [startTime, endTime] = droppedTimeRange(
      event.clientY - bounds.top,
      bounds.height,
      taskDuration(active.task) ?? 60,
    );
    const dayIndex = Math.min(
      props.days.length - 1,
      Math.floor(
        ((event.clientX - bounds.left) / bounds.width) * props.days.length,
      ),
    );
    props.onSchedule(active.task.id, props.days[dayIndex], startTime, endTime);
  }

  function cancelDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  return { beginDrag, continueDrag, endDrag, cancelDrag };
}
