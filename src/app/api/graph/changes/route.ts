import { auth } from "@/auth";
import { MAX_MUTATION_BYTES } from "@/services/graph/core/graph-size";
import {
  latestCommit,
  publishedRecords,
} from "@/services/graph/persistence/stores/graph-commit-store";
import { isGraphRevision } from "@/services/graph/sync/graph-sync-validation";

const MAX_PAGE_RECORDS = 500;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });

  const query = new URL(request.url).searchParams;
  const after = {
    generation: query.get("generation"),
    sequence: Number(query.get("after")),
  };
  const offset = Number(query.get("offset") ?? 0);
  if (!isGraphRevision(after) ||
    !Number.isSafeInteger(offset) ||
    offset < 0) {
    return new Response(null, { status: 400 });
  }

  const head = await latestCommit(session.user.id);
  if (!head || head.generation !== after.generation) {
    return Response.json({ reset: true }, { status: 409 });
  }
  const sequence = Number(query.get("until") ?? head.sequence);
  if (!Number.isSafeInteger(sequence) ||
    sequence < after.sequence ||
    sequence > head.sequence) {
    return new Response(null, { status: 400 });
  }
  if (sequence !== head.sequence) {
    return Response.json({ retry: true }, { status: 409 });
  }

  const revision = { generation: head.generation, sequence };
  const records = await publishedRecords(
    session.user.id,
    revision,
    { includeDeleted: true, after: after.sequence },
  );
  if ((await latestCommit(session.user.id))?._id !== head._id) {
    return Response.json({ retry: true }, { status: 409 });
  }

  let pageBytes = 0;
  const page = [];
  for (const record of records.slice(offset)) {
    const recordBytes = Buffer.byteLength(JSON.stringify(record));
    const pageIsFull = pageBytes + recordBytes > MAX_MUTATION_BYTES ||
      page.length >= MAX_PAGE_RECORDS;
    if (page.length && pageIsFull) break;
    page.push(record);
    pageBytes += recordBytes;
  }
  const nextOffset = offset + page.length < records.length
    ? offset + page.length
    : null;
  return Response.json({ revision, records: page, nextOffset });
}
