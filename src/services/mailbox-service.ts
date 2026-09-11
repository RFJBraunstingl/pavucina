import "server-only";

import { newestMessagesPerSource } from "./mailbox-message";
import { loadUnreadMailboxMessages } from "./mailbox-provider";
import { listMailboxConnections } from "./mailbox-repository";
import type {
  MailboxConnectionSummary,
  MailMessage,
} from "@/types/mailbox";

export async function loadMailboxInbox(userId: string) {
  const connections = await listMailboxConnections(userId);
  const results = await Promise.all(connections.map(async (connection) => {
    try {
      return {
        summary: {
          id: connection._id,
          source: connection.source,
          address: connection.address,
          status: "connected" as const,
        },
        messages: await loadUnreadMailboxMessages(connection),
      };
    } catch (error) {
      return {
        summary: {
          id: connection._id,
          source: connection.source,
          address: connection.address,
          status: "error" as const,
          error: error instanceof Error
            ? error.message
            : "Could not load mailbox",
        },
        messages: [] as MailMessage[],
      };
    }
  }));
  return {
    connections: results.map(
      ({ summary }) => summary,
    ) satisfies MailboxConnectionSummary[],
    messages: newestMessagesPerSource(results.flatMap(({ messages }) => messages)),
  };
}
