import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";

import type { TaskColumnResizeDragState } from "@/types/timeline";

const DEFAULT_WIDTH = 286;
const MIN_WIDTH = 200;
const MAX_WIDTH = 640;
const KEYBOARD_STEP = 16;

export function resizedTaskColumnWidth(width: number, change: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width + change));
}

export function useTaskColumnResize() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const drag = useRef<TaskColumnResizeDragState | null>(null);

  function beginResize(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originWidth: width,
    };
  }

  function continueResize(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    setWidth(
      resizedTaskColumnWidth(
        active.originWidth,
        event.clientX - active.originX,
      ),
    );
  }

  function endResize(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setWidth((current) =>
      resizedTaskColumnWidth(
        current,
        event.key === "ArrowLeft" ? -KEYBOARD_STEP : KEYBOARD_STEP,
      ),
    );
  }

  return {
    width,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    style: { "--task-column": `${width}px` } as CSSProperties,
    beginResize,
    continueResize,
    endResize,
    resizeWithKeyboard,
  };
}
