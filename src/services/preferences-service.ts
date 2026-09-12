import { isUuid } from "./graph-service.ts";
import {
  DEFAULT_TASK_COLUMN_WIDTH,
  isTaskColumnWidth,
} from "../utils/task-column.ts";
import { isAppPage, isStartPage } from "../utils/navigation.ts";
import type { UserPreferences } from "@/types/preferences";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  collapsedTaskIds: [],
  hideDone: true,
  showFullTaskPath: false,
  taskColumnWidth: DEFAULT_TASK_COLUMN_WIDTH,
  scheduleMode: "leaf",
  desktopStartPage: "last",
  mobileStartPage: "last",
};

export function resolvedScheduleMode(preferences: UserPreferences) {
  return preferences.scheduleMode ?? "leaf";
}

export function isUserPreferences(value: unknown): value is UserPreferences {
  if (typeof value !== "object" || value === null) return false;
  const preferences = value as Record<string, unknown>;
  if (
    Object.keys(preferences).some(
      (key) =>
        ![
          "collapsedTaskIds",
          "hideDone",
          "showFullTaskPath",
          "taskColumnWidth",
          "scheduleMode",
          "desktopStartPage",
          "mobileStartPage",
          "desktopLastPage",
          "mobileLastPage",
        ].includes(key),
    ) ||
    typeof preferences.hideDone !== "boolean" ||
    (preferences.showFullTaskPath !== undefined &&
      typeof preferences.showFullTaskPath !== "boolean") ||
    !Array.isArray(preferences.collapsedTaskIds) ||
    (preferences.taskColumnWidth !== undefined &&
      !isTaskColumnWidth(preferences.taskColumnWidth)) ||
    (preferences.scheduleMode !== undefined &&
      preferences.scheduleMode !== "leaf" &&
      preferences.scheduleMode !== "all") ||
    (preferences.desktopStartPage !== undefined &&
      !isStartPage(preferences.desktopStartPage)) ||
    (preferences.mobileStartPage !== undefined &&
      !isStartPage(preferences.mobileStartPage)) ||
    (preferences.desktopLastPage !== undefined &&
      !isAppPage(preferences.desktopLastPage)) ||
    (preferences.mobileLastPage !== undefined &&
      !isAppPage(preferences.mobileLastPage))
  ) {
    return false;
  }
  const ids = preferences.collapsedTaskIds;
  return (
    ids.every((id) => typeof id === "string" && isUuid(id)) &&
    new Set(ids).size === ids.length
  );
}

export function parseUserPreferences(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const preferences = { ...value } as Record<string, unknown>;
  for (const key of ["desktopStartPage", "mobileStartPage"]) {
    if (preferences[key] === "schedule") preferences[key] = "last";
  }
  for (const key of ["desktopLastPage", "mobileLastPage"]) {
    if (preferences[key] === "schedule") delete preferences[key];
  }
  return isUserPreferences(preferences) ? preferences : null;
}
