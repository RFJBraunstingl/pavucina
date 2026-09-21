import { auth } from "@/auth";
import {
  deleteCalendarConnection,
} from "@/services/calendar/providers/calendar-repository";
import { removeCalendarConnectionEvents } from "@/services/calendar/import/calendar-import-service";
import { isCalendarSelectionChanges } from "@/services/calendar/import/calendar-selection-patch";
import { patchCalendarSelections } from "@/services/calendar/import/calendar-selection-repository";
import { GraphConflictError } from "@/services/graph/sync/graph-patch-service";
import { readBoundedJson } from "@/services/http/request-json";
import { isUuid } from "@/utils/shared/id";

const MAX_BODY_BYTES = 256 * 1024;

export const runtime = "nodejs";

async function connectionId(context: { params: Promise<{ connectionId: string }> }) {
  const id = (await context.params).connectionId;
  return isUuid(id) ? id : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const id = await connectionId(context);
  if (!id) return Response.json({ error: "Invalid connection" }, { status: 400 });
  const body = await readBoundedJson(request, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  if (!isCalendarSelectionChanges(body)) return Response.json({ error: "Invalid calendar changes" }, { status: 400 });
  try {
    const matched = await patchCalendarSelections(session.user.id, id, body);
    return new Response(null, { status: matched ? 204 : 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save calendar settings",
      ...(error instanceof GraphConflictError && { conflicts: error.conflicts }) }, { status: error instanceof GraphConflictError ? 409 : 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const id = await connectionId(context);
  if (!id) return Response.json({ error: "Invalid connection" }, { status: 400 });
  const graph = await removeCalendarConnectionEvents(session.user.id, id);
  const result = await deleteCalendarConnection(session.user.id, id);
  return result.deletedCount
    ? Response.json(graph)
    : new Response(null, { status: 404 });
}
