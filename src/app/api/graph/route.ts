import { auth } from "@/auth";
import { isGraph } from "@/services/graph-service";
import {
  loadLatestGraph,
  saveGraphVersion,
} from "@/services/graph-repository";

const MAX_GRAPH_BYTES = 1024 * 1024;

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });

  const graph = await loadLatestGraph(session.user.id);
  return graph ? Response.json(graph) : new Response(null, { status: 404 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  }
  if (Number(request.headers.get("content-length")) > MAX_GRAPH_BYTES) {
    return Response.json({ error: "Graph is too large" }, { status: 413 });
  }

  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_GRAPH_BYTES) {
    return Response.json({ error: "Graph is too large" }, { status: 413 });
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isGraph(value)) {
    return Response.json({ error: "Invalid graph" }, { status: 400 });
  }

  const versionId = await saveGraphVersion(session.user.id, value);
  return Response.json({ versionId }, { status: 201 });
}
