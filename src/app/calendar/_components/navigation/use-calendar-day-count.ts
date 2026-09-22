import { useSyncExternalStore } from "react";

import { MOBILE_VIEW_QUERY } from "@/utils/navigation";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_VIEW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_VIEW_QUERY).matches ? 1 : 7;
}

export function useCalendarDayCount() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 1);
}
