import { auth } from "@/auth";
import { isGraph } from "@/services/graph-service";
import { MAX_MUTATION_BYTES, MAX_SNAPSHOT_BYTES } from "@/services/graph-size";
import { loadGraphSnapshot, patchGraph, replaceGraph } from "@/services/graph-repository";
import { GraphConflictError } from "@/services/graph-patch-service";
import { isGraphPatch } from "@/services/graph-sync-validation";
import { readBoundedJson } from "@/services/request-json";

export const runtime = "nodejs";
export async function GET() {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  try {
    const snapshot = await loadGraphSnapshot(session.user.id);
    return snapshot ? Response.json(snapshot) : new Response(null, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load graph" }, { status: 500 });
  }
}
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const body = await readBoundedJson(request, MAX_MUTATION_BYTES);
  if (body instanceof Response) return body;
  if (!isGraphPatch(body)) return Response.json({ error: "Invalid graph patch" }, { status: 400 });
  try { return Response.json({ revision: await patchGraph(session.user.id, body) }); }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save graph",
      ...(error instanceof GraphConflictError && { conflicts: error.conflicts }) },
    { status: error instanceof GraphConflictError ? 409 : 500 });
  }
}
async function snapshotWrite(request: Request, creating: boolean) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  if (creating && request.headers.get("if-none-match") !== "*") {
    return Response.json({ error: "Reload Pavucina to use incremental saves." }, { status: 426 });
  }
  const body = await readBoundedJson(request, MAX_SNAPSHOT_BYTES);
  if (body instanceof Response) return body;
  if (!isGraph(body)) return Response.json({ error: "Invalid graph" }, { status: 400 });
  if (creating && await loadGraphSnapshot(session.user.id)) return new Response(null, { status: 412 });
  const revision = await replaceGraph(session.user.id, body, creating);
  return revision ? Response.json({ revision }, { status: 201 }) : new Response(null, { status: 412 });
}
export const PUT = (request: Request) => snapshotWrite(request, true);
export const POST = (request: Request) => snapshotWrite(request, false);
