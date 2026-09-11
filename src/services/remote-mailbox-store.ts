import type { MailboxesResponse, MailboxSource } from "@/types/mailbox";

async function requireSuccess(response: Response, fallback: string) {
  if (response.ok) return;
  const value: unknown = await response.json().catch(() => null);
  const message = value && typeof value === "object" && "error" in value &&
    typeof value.error === "string" ? value.error : fallback;
  throw new Error(message);
}

export async function loadMailboxes() {
  const response = await fetch("/api/mailboxes", { cache: "no-store" });
  await requireSuccess(response, "Could not load mailboxes");
  return response.json() as Promise<MailboxesResponse>;
}

export async function beginMailboxConnection(source: MailboxSource) {
  const response = await fetch("/api/mailboxes/connect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source }),
  });
  await requireSuccess(response, "Could not connect mailbox");
}

export async function markRemoteMessageRead(
  connectionId: string,
  messageId: string,
) {
  const response = await fetch(`/api/mailboxes/${connectionId}/messages`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messageId }),
  });
  await requireSuccess(response, "Could not mark message as read");
}

export async function disconnectMailbox(connectionId: string) {
  const response = await fetch(`/api/mailboxes/${connectionId}`, {
    method: "DELETE",
  });
  await requireSuccess(response, "Could not disconnect mailbox");
}
