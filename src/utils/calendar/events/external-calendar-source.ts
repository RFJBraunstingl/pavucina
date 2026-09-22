import type {
  CalendarSelection,
  CalendarSource,
} from "@/types/calendar/events/external-calendar.ts";

export const CALENDAR_SOURCES: CalendarSource[] = ["google", "outlook"];
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function isCalendarSource(value: unknown): value is CalendarSource {
  return CALENDAR_SOURCES.includes(value as CalendarSource);
}

export function calendarSourceLabel(source: CalendarSource) {
  return source === "google" ? "Google Calendar" : "Outlook Calendar";
}

export function calendarAuthProvider(source: CalendarSource) {
  return source === "google" ? "google-calendar" : "outlook-calendar";
}

export function defaultCalendarColor(source: CalendarSource) {
  return source === "google" ? "#4285f4" : "#0078d4";
}

export function isCalendarColor(value: unknown): value is string {
  return typeof value === "string" && COLOR_PATTERN.test(value);
}

export function parseCalendarSelections(value: unknown) {
  if (!Array.isArray(value) || value.length > 100) return null;
  const selections: CalendarSelection[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const selection = item as Record<string, unknown>;
    if (
      typeof selection.id !== "string" ||
      !selection.id ||
      selection.id.length > 1024 ||
      typeof selection.name !== "string" ||
      !selection.name.trim() ||
      selection.name.length > 256 ||
      !isCalendarColor(selection.color) ||
      typeof selection.visible !== "boolean"
    ) return null;
    selections.push({
      id: selection.id,
      name: selection.name.trim(),
      color: selection.color.toLowerCase(),
      visible: selection.visible,
    });
  }
  return new Set(selections.map(({ id }) => id)).size === selections.length
    ? selections
    : null;
}
