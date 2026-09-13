import { requireSuccess } from "./remote-response";
import type {
  CalendarSelection,
  CalendarSource,
  CalendarsResponse,
} from "@/types/external-calendar";

export async function loadCalendars(
  start: string,
  end: string,
  signal?: AbortSignal,
  includeEvents = true,
) {
  const query = new URLSearchParams({ start, end, events: String(includeEvents) });
  const response = await fetch(`/api/calendars?${query}`, {
    cache: "no-store",
    signal,
  });
  await requireSuccess(response, "Could not load calendars");
  return response.json() as Promise<CalendarsResponse>;
}

export async function beginCalendarConnection(source: CalendarSource) {
  const response = await fetch("/api/calendars/connect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source }),
  });
  await requireSuccess(response, "Could not connect calendar");
}

export async function saveCalendarSelections(
  connectionId: string,
  calendars: CalendarSelection[],
) {
  const response = await fetch(`/api/calendars/${connectionId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ calendars }),
  });
  await requireSuccess(response, "Could not save calendar settings");
}

export async function disconnectCalendar(connectionId: string) {
  const response = await fetch(`/api/calendars/${connectionId}`, {
    method: "DELETE",
  });
  await requireSuccess(response, "Could not disconnect calendar");
  return response.json() as Promise<import("@/types/calendar-import").CalendarImportResponse>;
}
