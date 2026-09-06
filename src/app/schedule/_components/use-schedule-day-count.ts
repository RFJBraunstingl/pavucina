import { useSyncExternalStore } from "react";

const WIDE_SCREEN = "(min-width: 1200px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE_SCREEN);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(WIDE_SCREEN).matches ? 3 : 1;
}

export function useScheduleDayCount() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 1);
}
