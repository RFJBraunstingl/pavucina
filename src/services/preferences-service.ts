import { isUuid } from "./graph-service.ts";
import {
  DEFAULT_TASK_COLUMN_WIDTH,
  isTaskColumnWidth,
} from "../utils/task-column.ts";
import type { UserPreferences } from "@/types/preferences";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  collapsedTaskIds: [],
  hideDone: true,
  taskColumnWidth: DEFAULT_TASK_COLUMN_WIDTH,
};

export function isUserPreferences(value: unknown): value is UserPreferences {
  if (typeof value !== "object" || value === null) return false;
  const preferences = value as Record<string, unknown>;
  if (
    Object.keys(preferences).some(
      (key) => !["collapsedTaskIds", "hideDone", "taskColumnWidth"].includes(key),
    ) ||
    typeof preferences.hideDone !== "boolean" ||
    !Array.isArray(preferences.collapsedTaskIds) ||
    (preferences.taskColumnWidth !== undefined &&
      !isTaskColumnWidth(preferences.taskColumnWidth))
  ) {
    return false;
  }
  const ids = preferences.collapsedTaskIds;
  return (
    ids.every((id) => typeof id === "string" && isUuid(id)) &&
    new Set(ids).size === ids.length
  );
}
