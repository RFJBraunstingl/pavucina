import { openMailboxCredentials, sealMailboxCredentials } from "./mailbox-crypto";
import {
  createOAuthRequest,
} from "@/services/http/oauth/oauth-client";
import { refreshOAuthCredentials } from "@/services/http/oauth/oauth-token-refresh";
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
  const next = await refreshOAuthCredentials(
    credentials,
    {
      ...config,
      scope: connection.source === "outlook" ? MICROSOFT_SCOPES : undefined,
    },
    "Reconnect this mailbox to continue",
  );
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
