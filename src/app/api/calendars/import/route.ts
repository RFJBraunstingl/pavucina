import { auth } from "@/auth";
import {
  removeAllCalendarEvents,
  syncCalendarEvents,
} from "@/services/calendar/import/calendar-import-service";
import { updateCalendarImportPreference } from "@/services/preferences/storage/preferences-repository";
import { clearCalendarEventSyncStates } from "@/services/calendar/providers/calendar-repository";
import { isTimeZone } from "@/utils/calendar/events/event";

export const runtime = "nodejs";

async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return null;
  }
  if (Number(request.headers.get("content-length")) > 1024) return null;
  try {
    const body = await request.text();
    return Buffer.byteLength(body) <= 1024
      ? JSON.parse(body) as unknown
      : null;
  } catch {
    return null;
  }
}

function importRequest(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  return isTimeZone(body.timeZone) ? { timeZone: body.timeZone } : null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const body = importRequest(await readBody(request));
  if (!body) return Response.json({ error: "Invalid import request" }, { status: 400 });
  try {
    return Response.json(await syncCalendarEvents(session.user.id, body.timeZone));
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Could not import events",
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const value = await readBody(request);
  if (!value || typeof value !== "object") {
    return Response.json({ error: "Invalid import setting" }, { status: 400 });
  }
  const body = value as Record<string, unknown>;
  if (typeof body.enabled !== "boolean" ||
    (body.enabled && !isTimeZone(body.timeZone))) {
    return Response.json({ error: "Invalid import setting" }, { status: 400 });
  }
  try {
    await updateCalendarImportPreference(session.user.id, body.enabled);
    if (body.enabled) await clearCalendarEventSyncStates(session.user.id);
    const result = body.enabled
      ? await syncCalendarEvents(session.user.id, body.timeZone as string)
      : await removeAllCalendarEvents(session.user.id);
    return Response.json(result);
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Could not update event import",
    }, { status: 500 });
  }
}
