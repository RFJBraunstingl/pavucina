import { cookies } from "next/headers";

import { auth } from "@/auth";
import { MAILBOX_CONNECT_COOKIE } from "@/services/mailbox/providers/mailbox-oauth";
import { mailboxSourceAvailability } from "@/services/mailbox/providers/mailbox-provider";
import { loadMailboxInbox } from "@/services/mailbox/mailbox-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const cookieStore = await cookies();
  if (cookieStore.has(MAILBOX_CONNECT_COOKIE)) {
    cookieStore.delete(MAILBOX_CONNECT_COOKIE);
  }
  const available = mailboxSourceAvailability();
  if (!session?.user.id) {
    return Response.json({ available, connections: [], messages: [] });
  }
  try {
    return Response.json({
      available,
      ...await loadMailboxInbox(session.user.id),
    });
  } catch {
    return Response.json({ error: "Could not load mailboxes" }, { status: 500 });
  }
}
