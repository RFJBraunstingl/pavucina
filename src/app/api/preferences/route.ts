import { auth } from "@/auth";
import { GraphConflictError } from "@/services/graph/sync/graph-patch-service";
import { readBoundedJson } from "@/services/http/request-json";
import { isUserPreferences } from "@/services/preferences/preferences-service";
import { isSettingsPatch } from "@/services/preferences/settings-patch-service";
import {
  loadPreferences,
  patchPreferences,
  preferenceChanges,
  savePreferences,
} from "@/services/preferences/storage/preferences-repository";

const MAX_BODY_BYTES = 1_024 * 1_024;

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const afterValue = new URL(request.url).searchParams.get("after");
  if (afterValue !== null) {
    const after = Number(afterValue);
    if (!Number.isSafeInteger(after) || after < -1) {
      return new Response(null, { status: 400 });
    }
    return Response.json(await preferenceChanges(session.user.id, after));
  }
  return Response.json(await loadPreferences(session.user.id));
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const body = await readBoundedJson(request, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  if (!isSettingsPatch(body)) {
    return Response.json(
      { error: "Invalid preferences patch" },
      { status: 400 },
    );
  }
  try {
    await patchPreferences(session.user.id, body);
    return new Response(null, { status: 204 });
  } catch (error) {
    const conflict = error instanceof GraphConflictError;
    return Response.json(
      {
        error: error instanceof Error
          ? error.message
          : "Could not save preferences",
        ...(conflict && { conflicts: error.conflicts }),
      },
      { status: conflict ? 409 : 400 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  if (request.headers.get("x-pavucina-restore") !== "true") {
    return Response.json(
      { error: "Reload Pavucina to use incremental settings saves." },
      { status: 426 },
    );
  }
  const body = await readBoundedJson(request, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  if (!isUserPreferences(body)) return new Response(null, { status: 400 });
  await savePreferences(session.user.id, body);
  return new Response(null, { status: 204 });
}
