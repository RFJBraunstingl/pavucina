import { auth } from "@/auth";
import { latestCommit, publishedRecords } from "@/services/graph/persistence/graph-commit-store";
import { isGraphRevision } from "@/services/graph/sync/graph-sync-validation";
import { MAX_MUTATION_BYTES } from "@/services/graph/core/graph-size";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const query = new URL(request.url).searchParams;
  const after = { generation: query.get("generation"), sequence: Number(query.get("after")) };
  const offset = Number(query.get("offset") ?? 0);
  if (!isGraphRevision(after) || !Number.isSafeInteger(offset) || offset < 0) return new Response(null, { status: 400 });
  const head = await latestCommit(session.user.id);
  if (!head || head.generation !== after.generation) return Response.json({ reset: true }, { status: 409 });
  const sequence = Number(query.get("until") ?? head.sequence);
  if (!Number.isSafeInteger(sequence) || sequence < after.sequence || sequence > head.sequence) return new Response(null, { status: 400 });
  if (sequence !== head.sequence) return Response.json({ retry: true }, { status: 409 });
  const revision = { generation: head.generation, sequence };
  const records = await publishedRecords(session.user.id, revision, true, after.sequence);
  if ((await latestCommit(session.user.id))?._id !== head._id) return Response.json({ retry: true }, { status: 409 });
  let size = 0;
  const page = [];
  for (const record of records.slice(offset)) {
    const bytes = Buffer.byteLength(JSON.stringify(record));
    if (page.length && (size + bytes > MAX_MUTATION_BYTES || page.length >= 500)) break;
    page.push(record); size += bytes;
  }
  return Response.json({ revision, records: page,
    nextOffset: offset + page.length < records.length ? offset + page.length : null });
}
