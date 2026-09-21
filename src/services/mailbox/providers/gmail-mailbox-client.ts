import { normalizeGmailMessage } from "../mailbox-message";
import { mailboxRequest } from "./mailbox-auth";
import type {
  MailboxConnectionDocument,
  MailMessage,
} from "@/types/mailbox/mailbox";

export async function loadUnreadGmailMessages(
  connection: MailboxConnectionDocument,
) {
  const request = mailboxRequest(connection);
  const listUrl = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  );
  listUrl.searchParams.append("labelIds", "INBOX");
  listUrl.searchParams.append("labelIds", "UNREAD");
  listUrl.searchParams.set("maxResults", "25");
  const value: unknown = await (await request(listUrl.toString())).json();
  const listed = value && typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>).messages)
    ? (value as { messages: unknown[] }).messages
    : [];
  const ids = listed.flatMap((item) =>
    item && typeof item === "object" &&
    typeof (item as Record<string, unknown>).id === "string"
      ? [(item as { id: string }).id]
      : [],
  );
  const messages = await Promise.all(ids.map(async (id) => {
    const url = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`,
    );
    url.searchParams.set("format", "metadata");
    for (const header of ["Subject", "From", "Date"]) {
      url.searchParams.append("metadataHeaders", header);
    }
    return normalizeGmailMessage(
      connection,
      await (await request(url.toString())).json(),
    );
  }));
  return messages.filter((message): message is MailMessage => Boolean(message));
}

export async function markGmailMessageRead(
  connection: MailboxConnectionDocument,
  messageId: string,
) {
  await mailboxRequest(connection)(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/modify`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
    },
  );
}
