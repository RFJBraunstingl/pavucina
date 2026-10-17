import "server-only";

import { archiveGmailMessage, loadUnreadGmailMessages } from "./clients/gmail-mailbox-client";
import { archiveOutlookMessage, loadUnreadOutlookMessages } from "./clients/outlook-mailbox-client";
import type { MailboxConnectionDocument } from "@/types/mailbox/mailbox";

export { mailboxSourceAvailability } from "./mailbox-auth";

export function loadUnreadMailboxMessages(connection: MailboxConnectionDocument) {
  return connection.source === "gmail"
    ? loadUnreadGmailMessages(connection)
    : loadUnreadOutlookMessages(connection);
}

export function archiveMailboxMessage(
  connection: MailboxConnectionDocument,
  messageId: string,
) {
  return connection.source === "gmail"
    ? archiveGmailMessage(connection, messageId)
    : archiveOutlookMessage(connection, messageId);
}
