import { auth } from "@/auth";
import { isGraph } from "@/services/graph/core/graph-service";
import {
  MAX_MUTATION_BYTES,
  MAX_SNAPSHOT_BYTES,
} from "@/services/graph/core/graph-size";
import {
  patchGraph,
} from "@/services/graph/persistence/graph-repository";
import {
  loadGraphSnapshot,
  replaceGraph,
} from "@/services/graph/persistence/graph-snapshot-service";
import { GraphConflictError } from "@/services/graph/sync/graph-conflict-error";
import { isGraphPatch } from "@/services/graph/sync/graph-sync-validation";
import { readBoundedJson } from "@/services/http/request-json";

export const runtime = "nodejs";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET() {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  try {
    const snapshot = await loadGraphSnapshot(session.user.id);
    return snapshot
      ? Response.json(snapshot)
      : new Response(null, { status: 404 });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error, "Could not load graph") },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const body = await readBoundedJson(request, MAX_MUTATION_BYTES);
  if (body instanceof Response) return body;
  if (!isGraphPatch(body)) {
    return Response.json({ error: "Invalid graph patch" }, { status: 400 });
  }
  try {
    const revision = await patchGraph(session.user.id, body);
    return Response.json({ revision });
  } catch (error) {
    const conflict = error instanceof GraphConflictError;
    return Response.json(
      {
        error: errorMessage(error, "Could not save graph"),
        ...(conflict && { conflicts: error.conflicts }),
      },
      { status: conflict ? 409 : 500 },
    );
  }
}

async function snapshotWrite(request: Request, creating: boolean) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  if (creating && request.headers.get("if-none-match") !== "*") {
    return Response.json(
      { error: "Reload Pavucina to use incremental saves." },
      { status: 426 },
    );
  }
  const body = await readBoundedJson(request, MAX_SNAPSHOT_BYTES);
  if (body instanceof Response) return body;
  if (!isGraph(body)) {
    return Response.json({ error: "Invalid graph" }, { status: 400 });
  }
  if (creating && await loadGraphSnapshot(session.user.id)) {
    return new Response(null, { status: 412 });
  }
  const revision = await replaceGraph(session.user.id, body, creating);
  return revision
    ? Response.json({ revision }, { status: 201 })
    : new Response(null, { status: 412 });
}

export const PUT = (request: Request) => snapshotWrite(request, true);
export const POST = (request: Request) => snapshotWrite(request, false);
