import { pruneGraphStorage } from "@/services/graph/persistence/graph-maintenance-service";
import { authorizeMaintenance } from "@/services/infrastructure/maintenance-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = authorizeMaintenance(request.headers.get("authorization"));
  if (authorization === "unconfigured") {
    return Response.json({ error: "Maintenance is not configured" }, { status: 503 });
  }
  if (authorization === "unauthorized") {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  try {
    return Response.json(await pruneGraphStorage());
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Could not prune graph storage",
    }, { status: 500 });
  }
}
