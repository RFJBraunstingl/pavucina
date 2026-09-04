import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";

import {
  MAX_TASK_COLUMN_WIDTH,
  MIN_TASK_COLUMN_WIDTH,
  resizedTaskColumnWidth,
} from "@/utils/task-column";
import type { TaskColumnResizeDragState } from "@/types/timeline";

const KEYBOARD_STEP = 16;

export function useTaskColumnResize(
  initialWidth: number,
  onWidthChange: (width: number) => void,
) {
  const [width, setWidth] = useState(initialWidth);
  const widthRef = useRef(initialWidth);
  const drag = useRef<TaskColumnResizeDragState | null>(null);

  function updateWidth(value: number) {
    widthRef.current = value;
    setWidth(value);
  }

  function beginResize(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originWidth: widthRef.current,
    };
  }

  function continueResize(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    updateWidth(
      resizedTaskColumnWidth(
        active.originWidth,
        event.clientX - active.originX,
      ),
    );
  }

  function endResize(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    onWidthChange(widthRef.current);
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = resizedTaskColumnWidth(
      widthRef.current,
      event.key === "ArrowLeft" ? -KEYBOARD_STEP : KEYBOARD_STEP,
    );
    updateWidth(next);
    onWidthChange(next);
  }

  return {
    width,
    minWidth: MIN_TASK_COLUMN_WIDTH,
    maxWidth: MAX_TASK_COLUMN_WIDTH,
    style: { "--task-column": `${width}px` } as CSSProperties,
    beginResize,
    continueResize,
    endResize,
    resizeWithKeyboard,
  };
}
