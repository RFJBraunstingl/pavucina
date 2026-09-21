import "server-only";

import { loadUnreadGmailMessages, markGmailMessageRead } from "./gmail-mailbox-client";
import { loadUnreadOutlookMessages, markOutlookMessageRead } from "./outlook-mailbox-client";
import type { MailboxConnectionDocument } from "@/types/mailbox/mailbox";

export { mailboxSourceAvailability } from "./mailbox-auth";

export function loadUnreadMailboxMessages(connection: MailboxConnectionDocument) {
  return connection.source === "gmail"
    ? loadUnreadGmailMessages(connection)
    : loadUnreadOutlookMessages(connection);
}

export function markMailboxMessageRead(
  connection: MailboxConnectionDocument,
  messageId: string,
) {
  return connection.source === "gmail"
    ? markGmailMessageRead(connection, messageId)
    : markOutlookMessageRead(connection, messageId);
}
