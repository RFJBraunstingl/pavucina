import { auth } from "@/auth";
import { isUserPreferences } from "@/services/preferences/preferences-service";
import { loadPreferences, preferenceChanges, patchPreferences, savePreferences } from "@/services/preferences/storage/preferences-repository";
import { isSettingsPatch } from "@/services/preferences/settings-patch-service";
import { GraphConflictError } from "@/services/graph/sync/graph-patch-service";
import { readBoundedJson } from "@/services/http/request-json";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const after = new URL(request.url).searchParams.get("after");
  if (after !== null) {
    if (!Number.isSafeInteger(Number(after)) || Number(after) < -1) return new Response(null, { status: 400 });
    return Response.json(await preferenceChanges(session.user.id, Number(after)));
  }
  return Response.json(await loadPreferences(session.user.id));
}
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const body = await readBoundedJson(request, 1024 * 1024);
  if (body instanceof Response) return body;
  if (!isSettingsPatch(body)) return Response.json({ error: "Invalid preferences patch" }, { status: 400 });
  try { await patchPreferences(session.user.id, body); return new Response(null, { status: 204 }); }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save preferences",
      ...(error instanceof GraphConflictError && { conflicts: error.conflicts }) }, { status: error instanceof GraphConflictError ? 409 : 400 });
  }
}
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  if (request.headers.get("x-pavucina-restore") !== "true") return Response.json({ error: "Reload Pavucina to use incremental settings saves." }, { status: 426 });
  const body = await readBoundedJson(request, 1024 * 1024);
  if (body instanceof Response) return body;
  if (!isUserPreferences(body)) return new Response(null, { status: 400 });
  await savePreferences(session.user.id, body);
  return new Response(null, { status: 204 });
}
