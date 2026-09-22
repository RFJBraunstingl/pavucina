import { auth } from "@/auth";
import { deleteMailboxConnection } from "@/services/mailbox/mailbox-repository";
import { isUuid } from "@/utils/shared/id";

export async function DELETE(
  _request: Request,
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
  const result = await deleteMailboxConnection(session.user.id, connectionId);
  return new Response(null, { status: result.deletedCount ? 204 : 404 });
}
