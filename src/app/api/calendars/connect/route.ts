import { cookies } from "next/headers";

import { auth } from "@/auth";
import {
  CALENDAR_CONNECT_COOKIE,
  CALENDAR_CONNECT_MAX_AGE,
  createCalendarConnectRequest,
} from "@/services/calendar/providers/calendar-oauth";
import { calendarSourceAvailability } from "@/services/calendar/providers/calendar-provider";
import { isCalendarSource } from "@/utils/calendar/external-calendar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  }
  const value: unknown = await request.json().catch(() => null);
  const source = value && typeof value === "object" && "source" in value
    ? value.source
    : null;
  if (!isCalendarSource(source)) {
    return Response.json({ error: "Invalid calendar source" }, { status: 400 });
  }
  if (!calendarSourceAvailability()[source]) {
    return Response.json(
      { error: "This calendar source is not configured" },
      { status: 503 },
    );
  }
  const userId = (await auth())?.user.id;
  (await cookies()).set(
    CALENDAR_CONNECT_COOKIE,
    createCalendarConnectRequest(source, userId),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CALENDAR_CONNECT_MAX_AGE,
    },
  );
  return new Response(null, { status: 204 });
}
