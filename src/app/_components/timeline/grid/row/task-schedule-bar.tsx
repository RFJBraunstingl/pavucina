import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

import type { TaskScheduleBarProps } from "@/types/timeline/timeline-task";

export default function TaskScheduleBar({
  task,
  schedulingDisabled,
  start,
  end,
  startOffset,
  endOffset,
  visibleStart,
  visibleEnd,
  dayCount,
  scheduleHint,
  onDragStart,
  onPointerMove,
  onPointerEnd,
  onArrow,
}: TaskScheduleBarProps) {
  const handlers = (mode: "start" | "move" | "end") => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) =>
      onDragStart(event, task.id, mode),
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
      onArrow(event, task.id, mode),
  });

  return (
    <div
      className="task-bar"
      style={{
        gridColumn: `${visibleStart + 2} / span ${visibleEnd - visibleStart + 1}`,
      } as CSSProperties}
    >
      {startOffset >= 0 && (
        <button
          type="button"
          className="resize-handle start"
          aria-label={`Resize start of ${task.properties.name}`}
          disabled={schedulingDisabled}
          title={scheduleHint}
          {...handlers("start")}
        />
      )}
      <button
        type="button"
        className="bar-body"
        aria-label={`Move ${task.properties.name}`}
        disabled={schedulingDisabled}
        title={scheduleHint ?? `${task.properties.name}: ${start} to ${end}`}
        {...handlers("move")}
      >
        <span>{task.properties.name}</span>
      </button>
      {endOffset < dayCount && (
        <button
          type="button"
          className="resize-handle end"
          aria-label={`Resize end of ${task.properties.name}`}
          disabled={schedulingDisabled}
          title={scheduleHint}
          {...handlers("end")}
        />
      )}
    </div>
  );
}
