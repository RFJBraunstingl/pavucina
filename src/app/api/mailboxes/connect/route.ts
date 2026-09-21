import { cookies } from "next/headers";

import { auth } from "@/auth";
import {
  MAILBOX_CONNECT_COOKIE,
  MAILBOX_CONNECT_MAX_AGE,
  createMailboxConnectRequest,
} from "@/services/mailbox/providers/mailbox-oauth";
import { mailboxSourceAvailability } from "@/services/mailbox/providers/mailbox-provider";
import { isMailboxSource } from "@/utils/mailbox";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  }
  const value: unknown = await request.json().catch(() => null);
  const source = value && typeof value === "object" && "source" in value
    ? value.source
    : null;
  if (!isMailboxSource(source)) {
    return Response.json({ error: "Invalid mailbox source" }, { status: 400 });
  }
  if (!mailboxSourceAvailability()[source]) {
    return Response.json(
      { error: "This mailbox source is not configured" },
      { status: 503 },
    );
  }
  const userId = (await auth())?.user.id;
  (await cookies()).set(
    MAILBOX_CONNECT_COOKIE,
    createMailboxConnectRequest(source, userId),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAILBOX_CONNECT_MAX_AGE,
    },
  );
  return new Response(null, { status: 204 });
}
