import { auth } from "@/auth";
import {
  deleteCalendarConnection,
  updateCalendarSelections,
} from "@/services/calendar-repository";
import { parseCalendarSelections } from "@/utils/external-calendar";
import { isUuid } from "@/utils/id";

const MAX_BODY_BYTES = 256 * 1024;

export const runtime = "nodejs";

async function connectionId(context: { params: Promise<{ connectionId: string }> }) {
  const id = (await context.params).connectionId;
  return isUuid(id) ? id : null;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const id = await connectionId(context);
  if (!id) return Response.json({ error: "Invalid connection" }, { status: 400 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  }
  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return Response.json({ error: "Calendar settings are too large" }, { status: 413 });
  }
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const calendars = value && typeof value === "object" && "calendars" in value
    ? parseCalendarSelections(value.calendars)
    : null;
  if (!calendars) {
    return Response.json({ error: "Invalid calendar settings" }, { status: 400 });
  }
  const result = await updateCalendarSelections(session.user.id, id, calendars);
  return new Response(null, { status: result.matchedCount ? 204 : 404 });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const id = await connectionId(context);
  if (!id) return Response.json({ error: "Invalid connection" }, { status: 400 });
  const result = await deleteCalendarConnection(session.user.id, id);
  return new Response(null, { status: result.deletedCount ? 204 : 404 });
}
