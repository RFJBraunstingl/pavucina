import {
  openOAuthCredentials,
  openOAuthValue,
  sealOAuthValue,
} from "@/services/http/oauth-client.ts";
import type { MailboxCredentials } from "@/types/mailbox/mailbox";

export const sealMailboxValue = sealOAuthValue;
export const openMailboxValue = openOAuthValue;

export function sealMailboxCredentials(credentials: MailboxCredentials) {
  return sealMailboxValue(credentials, "mailbox-credentials");
}

export function openMailboxCredentials(value: string): MailboxCredentials {
  return openOAuthCredentials(value, "mailbox-credentials");
}
