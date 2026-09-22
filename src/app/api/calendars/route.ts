import { cookies } from "next/headers";

import { auth } from "@/auth";
import { CALENDAR_CONNECT_COOKIE } from "@/services/calendar/providers/calendar-oauth";
import { calendarSourceAvailability } from "@/services/calendar/providers/calendar-auth";
import { loadExternalCalendars } from "@/services/calendar/core/calendar-service";

const MAX_RANGE_MS = 8 * 24 * 60 * 60 * 1_000;

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  const cookieStore = await cookies();
  if (cookieStore.has(CALENDAR_CONNECT_COOKIE)) {
    cookieStore.delete(CALENDAR_CONNECT_COOKIE);
  }
  const available = calendarSourceAvailability();
  if (!session?.user.id) {
    return Response.json({ available, connections: [], events: [] });
  }
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const includeEvents = url.searchParams.get("events") !== "false";
  const startTime = start ? Date.parse(start) : Number.NaN;
  const endTime = end ? Date.parse(end) : Number.NaN;
  if (
    !start ||
    !end ||
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime <= startTime ||
    endTime - startTime > MAX_RANGE_MS
  ) return Response.json({ error: "Invalid calendar range" }, { status: 400 });
  try {
    return Response.json({
      available,
      ...await loadExternalCalendars(session.user.id, start, end, includeEvents),
    });
  } catch {
    return Response.json({ error: "Could not load calendars" }, { status: 500 });
  }
}
