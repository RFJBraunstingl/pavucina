import { openMailboxCredentials, sealMailboxCredentials } from "./mailbox-crypto";
import { createOAuthRequest } from "@/services/http/oauth-client";
import { updateMailboxCredentials } from "../mailbox-repository";
import type {
  MailboxConnectionDocument,
  MailboxCredentials,
  MailboxSource,
} from "@/types/mailbox/mailbox";

const MICROSOFT_SCOPES =
  "openid profile email offline_access User.Read Mail.ReadWrite";

function sourceConfig(source: MailboxSource) {
  return source === "gmail"
    ? {
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        tokenUrl: "https://oauth2.googleapis.com/token",
      }
    : {
        clientId:
          process.env.AUTH_OUTLOOK_ID ?? process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret:
          process.env.AUTH_OUTLOOK_SECRET ??
          process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      };
}

export function mailboxSourceAvailability() {
  const gmail = sourceConfig("gmail");
  const outlook = sourceConfig("outlook");
  return {
    gmail: Boolean(gmail.clientId && gmail.clientSecret),
    outlook: Boolean(outlook.clientId && outlook.clientSecret),
  };
}

async function refreshedCredentials(
  connection: MailboxConnectionDocument,
  credentials: MailboxCredentials,
) {
  const config = sourceConfig(connection.source);
  if (!config.clientId || !config.clientSecret || !credentials.refreshToken) {
    throw new Error("Reconnect this mailbox to continue");
  }
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: credentials.refreshToken,
  });
  if (connection.source === "outlook") body.set("scope", MICROSOFT_SCOPES);
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const value: unknown = await response.json().catch(() => null);
  const token = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  if (!response.ok || typeof token.access_token !== "string") {
    throw new Error("Reconnect this mailbox to continue");
  }
  const next: MailboxCredentials = {
    accessToken: token.access_token,
    refreshToken: typeof token.refresh_token === "string"
      ? token.refresh_token
      : credentials.refreshToken,
    expiresAt: Date.now() +
      (typeof token.expires_in === "number" ? token.expires_in : 3600) * 1_000,
  };
  await updateMailboxCredentials(connection, sealMailboxCredentials(next));
  return next;
}

export function mailboxRequest(connection: MailboxConnectionDocument) {
  return createOAuthRequest(
    openMailboxCredentials(connection.credentials),
    (credentials) => refreshedCredentials(connection, credentials),
    "Could not access mailbox",
  );
}
