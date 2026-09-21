import { useRef, useState, type PointerEvent } from "react";

const DRAG_THRESHOLD = 4;

type DragState = {
  pointerId: number;
  taskId: string;
  originX: number;
  originY: number;
  started: boolean;
};

function taskAt(event: PointerEvent<HTMLButtonElement>) {
  return document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>("[data-task-id]")
    ?.dataset.taskId;
}

export function useInboxDrag(onMove: (taskId: string, parentId: string) => void) {
  const drag = useRef<DragState | null>(null);
  const targetRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [targetId, setTargetState] = useState<string | null>(null);

  function setTarget(id: string | null) {
    targetRef.current = id;
    setTargetState(id);
  }

  function clear() {
    drag.current = null;
    setDraggingId(null);
    setTarget(null);
  }

  function begin(event: PointerEvent<HTMLButtonElement>, taskId: string) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      taskId,
      originX: event.clientX,
      originY: event.clientY,
      started: false,
    };
    setDraggingId(taskId);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (
      !active.started &&
      Math.hypot(event.clientX - active.originX, event.clientY - active.originY) <
        DRAG_THRESHOLD
    ) {
      return;
    }
    active.started = true;
    event.preventDefault();
    setTarget(taskAt(event) ?? null);
  }

  function end(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const parentId = targetRef.current;
    if (active.started && parentId) onMove(active.taskId, parentId);
    clear();
  }

  function cancel(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId === event.pointerId) clear();
  }

  return { draggingId, targetId, begin, move, end, cancel };
}
