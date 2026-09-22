import { isUuid } from "@/utils/shared/id.ts";
import type { MailboxSource, MailTaskOrigin } from "@/types/mailbox/mailbox.ts";

export const MAILBOX_SOURCES: MailboxSource[] = ["gmail", "outlook"];

export function isMailboxSource(value: unknown): value is MailboxSource {
  return MAILBOX_SOURCES.includes(value as MailboxSource);
}

export function mailboxSourceLabel(source: MailboxSource) {
  return source === "gmail" ? "Gmail" : "Outlook";
}

export function isMailTaskOrigin(value: unknown): value is MailTaskOrigin {
  if (!value || typeof value !== "object") return false;
  const origin = value as Record<string, unknown>;
  return (
    isMailboxSource(origin.source) &&
    typeof origin.connectionId === "string" &&
    isUuid(origin.connectionId) &&
    typeof origin.id === "string" &&
    Boolean(origin.id) &&
    origin.id.length <= 1024
  );
}
