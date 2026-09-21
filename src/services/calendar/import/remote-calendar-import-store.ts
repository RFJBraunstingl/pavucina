import { requireSuccess } from "@/services/http/remote-response.ts";
import type { CalendarImportResponse } from "@/types/calendar/calendar-import.ts";

function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

async function requestImport(method: "POST" | "PUT", enabled?: boolean) {
  const response = await fetch("/api/calendars/import", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...(enabled !== undefined && { enabled }),
      ...((enabled ?? true) && { timeZone: currentTimeZone() }),
    }),
  });
  await requireSuccess(response, "Could not synchronize calendar events");
  return response.json() as Promise<CalendarImportResponse>;
}

export function syncImportedCalendarEvents() {
  return requestImport("POST");
}

export function setCalendarEventImport(enabled: boolean) {
  return requestImport("PUT", enabled);
}
