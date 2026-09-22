export async function readBoundedJson(
  request: Request,
  maximumBytes: number,
): Promise<unknown | Response> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  }
  const declaredBytes = Number(request.headers.get("content-length"));
  if (declaredBytes > maximumBytes) {
    return Response.json({ error: "Request is too large" }, { status: 413 });
  }
  const reader = request.body?.getReader();
  if (!reader) {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }

  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        return Response.json(
          { error: "Request is too large" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
}
