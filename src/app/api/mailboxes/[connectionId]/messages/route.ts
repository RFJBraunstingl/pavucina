import { auth } from "@/auth";
import { markMailboxMessageRead } from "@/services/mailbox-provider";
import { findMailboxConnection } from "@/services/mailbox-repository";
import { isUuid } from "@/utils/id";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ connectionId: string }> },
) {
  const session = await auth();
  if (!session?.user.id) return new Response(null, { status: 401 });
  const { connectionId } = await context.params;
  if (!isUuid(connectionId)) {
    return Response.json(
      { error: "Invalid mailbox connection" },
      { status: 400 },
    );
  }
  const value: unknown = await request.json().catch(() => null);
  const messageId = value && typeof value === "object" && "messageId" in value
    ? value.messageId
    : null;
  if (typeof messageId !== "string" || !messageId || messageId.length > 1024) {
    return Response.json({ error: "Invalid message" }, { status: 400 });
  }
  const connection = await findMailboxConnection(
    session.user.id,
    connectionId,
  );
  if (!connection) return new Response(null, { status: 404 });
  try {
    await markMailboxMessageRead(connection, messageId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error
          ? error.message
          : "Could not update message",
      },
      { status: 502 },
    );
  }
}
