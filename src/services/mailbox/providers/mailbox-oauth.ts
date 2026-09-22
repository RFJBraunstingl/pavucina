import "server-only";

import { cookies } from "next/headers";

import {
  openMailboxCredentials,
  sealMailboxCredentials,
  sealMailboxValue,
} from "./mailbox-crypto";
import {
  findMailboxConnectionByAccount,
  saveMailboxConnection,
} from "../mailbox-repository";
import { resolveUserId } from "@/services/account/auth/user-identity";
import { readOAuthConnectRequest } from "@/services/http/oauth/oauth-client";
import { isMailboxSource } from "@/utils/mailbox";
import type { OAuthProviderTokens } from "@/types/auth/oauth";
import type { MailboxCredentials, MailboxSource } from "@/types/mailbox/mailbox";

export const MAILBOX_CONNECT_COOKIE = "pavucina.mailbox-connect";
export const MAILBOX_CONNECT_MAX_AGE = 10 * 60;

function authProvider(source: MailboxSource) {
  return source === "gmail" ? "google" : "microsoft-entra-id";
}

export function createMailboxConnectRequest(
  source: MailboxSource,
  userId?: string,
) {
  return sealMailboxValue(
    {
      source,
      userId,
      expiresAt: Date.now() + MAILBOX_CONNECT_MAX_AGE * 1_000,
    },
    "mailbox-connect",
  );
}

export function readMailboxConnectRequest(value?: string) {
  return readOAuthConnectRequest(value, "mailbox-connect", isMailboxSource);
}

async function currentRequest(source: MailboxSource) {
  const value = (await cookies()).get(MAILBOX_CONNECT_COOKIE)?.value;
  const request = readMailboxConnectRequest(value);
  if (!request || request.source !== source) {
    throw new Error("Mailbox connection request is missing or expired");
  }
  return request;
}

async function targetUserId(source: MailboxSource, providerAccountId: string) {
  const request = await currentRequest(source);
  return request.userId ?? resolveUserId(authProvider(source), providerAccountId);
}

export async function connectMailboxFromOAuth(
  source: MailboxSource,
  providerAccountId: string,
  address: string,
  tokens: OAuthProviderTokens,
) {
  if (!tokens.access_token) throw new Error("Mailbox access was not granted");
  const userId = await targetUserId(source, providerAccountId);
  const existing = await findMailboxConnectionByAccount(
    userId,
    source,
    providerAccountId,
  );
  const previous = existing
    ? openMailboxCredentials(existing.credentials)
    : undefined;
  const credentials: MailboxCredentials = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? previous?.refreshToken,
    expiresAt: tokens.expires_at ? tokens.expires_at * 1_000 : undefined,
  };
  await saveMailboxConnection(
    userId,
    source,
    providerAccountId,
    address || providerAccountId,
    sealMailboxCredentials(credentials),
  );
}

export function mailboxSessionUserId(
  source: MailboxSource,
  providerAccountId: string,
) {
  return targetUserId(source, providerAccountId);
}
