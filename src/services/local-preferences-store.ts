import {
  DEFAULT_USER_PREFERENCES,
  parseUserPreferences,
} from "./preferences-service.ts";
import type { UserPreferences } from "@/types/preferences";

const STORAGE_KEY = "pavucina.preferences.v1";

export function loadGuestPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const value: unknown = stored ? JSON.parse(stored) : null;
    const preferences = parseUserPreferences(value);
    if (preferences) {
      return { ...DEFAULT_USER_PREFERENCES, ...preferences };
    }
  } catch {
    // A bad browser value should not prevent the application from opening.
  }
  return DEFAULT_USER_PREFERENCES;
}

export function saveGuestPreferences(preferences: UserPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    // Keep the in-memory app usable when browser storage is unavailable or full.
    return false;
  }
}
