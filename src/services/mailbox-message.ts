import type {
  MailboxConnectionDocument,
  MailMessage,
} from "../types/mailbox.ts";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
}

function receivedAt(value: unknown) {
  const date = new Date(typeof value === "string" ? value : 0);
  return Number.isNaN(date.valueOf())
    ? new Date(0).toISOString()
    : date.toISOString();
}

export function normalizeGmailMessage(
  connection: MailboxConnectionDocument,
  value: unknown,
): MailMessage | null {
  const message = record(value);
  const payload = record(message?.payload);
  const headers = Array.isArray(payload?.headers) ? payload.headers : [];
  const header = (name: string) => {
    const match = headers.map(record).find(
      (item) => item?.name === name && typeof item.value === "string",
    );
    return typeof match?.value === "string" ? match.value : "";
  };
  if (typeof message?.id !== "string" || !message.id) return null;
  const internalDate = typeof message.internalDate === "string"
    ? Number(message.internalDate)
    : Number.NaN;
  const dateValue = Number.isFinite(internalDate)
    ? new Date(internalDate).toISOString()
    : header("Date");
  return {
    connectionId: connection._id,
    source: "gmail",
    account: connection.address,
    id: message.id,
    subject: header("Subject").trim() || "(No subject)",
    sender: header("From").trim() || "Unknown sender",
    receivedAt: receivedAt(dateValue),
    preview: typeof message.snippet === "string" ? message.snippet.trim() : "",
  };
}

export function normalizeOutlookMessage(
  connection: MailboxConnectionDocument,
  value: unknown,
): MailMessage | null {
  const message = record(value);
  const from = record(record(message?.from)?.emailAddress);
  if (typeof message?.id !== "string" || !message.id) return null;
  const name = typeof from?.name === "string" ? from.name.trim() : "";
  const address = typeof from?.address === "string" ? from.address.trim() : "";
  return {
    connectionId: connection._id,
    source: "outlook",
    account: connection.address,
    id: message.id,
    subject: typeof message.subject === "string" && message.subject.trim()
      ? message.subject.trim()
      : "(No subject)",
    sender: name && address && name !== address
      ? `${name} <${address}>`
      : name || address || "Unknown sender",
    receivedAt: receivedAt(message.receivedDateTime),
    preview: typeof message.bodyPreview === "string"
      ? message.bodyPreview.trim()
      : "",
  };
}

export function newestMessagesPerSource(
  messages: MailMessage[],
  limit = 25,
) {
  const counts = new Map<string, number>();
  return [...messages]
    .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
    .filter((message) => {
      const count = counts.get(message.source) ?? 0;
      if (count >= limit) return false;
      counts.set(message.source, count + 1);
      return true;
    });
}
