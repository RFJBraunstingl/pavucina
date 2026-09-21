import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { suggestCalendarEvent } from "@/utils/calendar/calendar-creation";
import type { CalendarCreationOptions, CalendarPointerOrigin, CalendarPreview } from "@/types/calendar/calendar";

export function useCalendarCreation(options: CalendarCreationOptions) {
  const [hover, setHover] = useState<CalendarPreview | null>(null);
  const origin = useRef<CalendarPointerOrigin | null>(null);
  const { days, items, locked, creating, bodyRef, onCreate } = options;
  const preview = !locked && !creating && hover?.items === items && hover.days === days
    ? hover.range : null;

  function rangeAt(event: MouseEvent<HTMLDivElement>) {
    const body = bodyRef.current;
    if (locked || creating || !body || !(event.target instanceof HTMLElement) ||
      !event.target.matches(".calendar-days, .calendar-day")) return null;
    const bounds = body.getBoundingClientRect();
    const index = Math.floor((event.clientX - bounds.left) / bounds.width * days.length);
    const minute = (event.clientY - bounds.top) / bounds.height * 1440;
    return days[index] ? suggestCalendarEvent(items, days[index], minute) : null;
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const range = event.pointerType === "mouse" && event.buttons === 0 ? rangeAt(event) : null;
    setHover(range ? { range, items, days } : null);
  }

  function begin(event: PointerEvent<HTMLDivElement>) {
    origin.current = event.button === 0 && rangeAt(event)
      ? { x: event.clientX, y: event.clientY } : null;
  }

  function click(event: MouseEvent<HTMLDivElement>) {
    const start = origin.current;
    origin.current = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const range = rangeAt(event);
    if (range) {
      setHover(null);
      onCreate(range);
    }
  }

  function clear() {
    setHover(null);
    origin.current = null;
  }

  function leave(event: PointerEvent<HTMLDivElement>) {
    // Touch pointers leave before their compatibility click is dispatched.
    if (event.pointerType === "mouse") clear();
    else setHover(null);
  }

  return { preview, move, begin, click, clear, leave };
}
