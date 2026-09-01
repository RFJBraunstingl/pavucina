import { isUuid } from "./graph-service.ts";
import type { UserPreferences } from "@/types/preferences";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  collapsedTaskIds: [],
  hideDone: true,
};

export function isUserPreferences(value: unknown): value is UserPreferences {
  if (typeof value !== "object" || value === null) return false;
  const preferences = value as Record<string, unknown>;
  if (
    Object.keys(preferences).length !== 2 ||
    typeof preferences.hideDone !== "boolean" ||
    !Array.isArray(preferences.collapsedTaskIds)
  ) {
    return false;
  }
  const ids = preferences.collapsedTaskIds;
  return (
    ids.every((id) => typeof id === "string" && isUuid(id)) &&
    new Set(ids).size === ids.length
  );
}
