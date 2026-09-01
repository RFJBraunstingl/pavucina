import { auth } from "@/auth";
import { isUserPreferences } from "@/services/preferences-service";
import {
  loadPreferences,
  savePreferences,
} from "@/services/preferences-repository";

const MAX_PREFERENCES_BYTES = 1024 * 1024;

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  return Response.json(await loadPreferences(session.user.id));
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  }
  if (Number(request.headers.get("content-length")) > MAX_PREFERENCES_BYTES) {
    return Response.json({ error: "Preferences are too large" }, { status: 413 });
  }

  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_PREFERENCES_BYTES) {
    return Response.json({ error: "Preferences are too large" }, { status: 413 });
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isUserPreferences(value)) {
    return Response.json({ error: "Invalid preferences" }, { status: 400 });
  }

  await savePreferences(session.user.id, value);
  return new Response(null, { status: 204 });
}
