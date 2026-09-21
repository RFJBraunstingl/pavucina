import { normalizeOutlookMessage } from "../mailbox-message";
import { mailboxRequest } from "./mailbox-auth";
import type {
  MailboxConnectionDocument,
  MailMessage,
} from "@/types/mailbox/mailbox";

export async function loadUnreadOutlookMessages(
  connection: MailboxConnectionDocument,
) {
  const request = mailboxRequest(connection);
  const url = new URL(
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages",
  );
  url.searchParams.set("$filter", "isRead eq false");
  url.searchParams.set("$top", "25");
  url.searchParams.set(
    "$select",
    "id,subject,from,receivedDateTime,bodyPreview",
  );
  const value: unknown = await (await request(url.toString())).json();
  const messages = value && typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>).value)
    ? (value as { value: unknown[] }).value
    : [];
  return messages
    .map((message) => normalizeOutlookMessage(connection, message))
    .filter((message): message is MailMessage => Boolean(message));
}

export async function markOutlookMessageRead(
  connection: MailboxConnectionDocument,
  messageId: string,
) {
  await mailboxRequest(connection)(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    },
  );
}
