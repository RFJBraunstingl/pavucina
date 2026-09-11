import "server-only";

import {
  normalizeGmailMessage,
  normalizeOutlookMessage,
} from "./mailbox-message";
import {
  openMailboxCredentials,
  sealMailboxCredentials,
} from "./mailbox-crypto";
import { updateMailboxCredentials } from "./mailbox-repository";
import type {
  MailboxConnectionDocument,
  MailboxCredentials,
  MailMessage,
  MailboxSource,
} from "@/types/mailbox";

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

function mailboxRequest(connection: MailboxConnectionDocument) {
  let credentials = openMailboxCredentials(connection.credentials);
  return async (url: string, init?: RequestInit) => {
    const request = async (forceRefresh = false) => {
      if (
        forceRefresh ||
        (credentials.expiresAt !== undefined &&
          credentials.expiresAt <= Date.now() + 60_000)
      ) credentials = await refreshedCredentials(connection, credentials);
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${credentials.accessToken}`);
      return fetch(url, { ...init, headers });
    };
    let response = await request();
    if (response.status === 401) response = await request(true);
    if (!response.ok) {
      throw new Error(`Could not access mailbox (${response.status})`);
    }
    return response;
  };
}

async function gmailMessages(connection: MailboxConnectionDocument) {
  const request = mailboxRequest(connection);
  const listUrl = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  );
  listUrl.searchParams.append("labelIds", "INBOX");
  listUrl.searchParams.append("labelIds", "UNREAD");
  listUrl.searchParams.set("maxResults", "25");
  const value: unknown = await (await request(listUrl.toString())).json();
  const listed = value && typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>).messages)
    ? (value as { messages: unknown[] }).messages
    : [];
  const ids = listed.flatMap((item) =>
    item && typeof item === "object" &&
    typeof (item as Record<string, unknown>).id === "string"
      ? [(item as { id: string }).id]
      : [],
  );
  const messages = await Promise.all(ids.map(async (id) => {
    const url = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`,
    );
    url.searchParams.set("format", "metadata");
    ["Subject", "From", "Date"].forEach((header) =>
      url.searchParams.append("metadataHeaders", header));
    return normalizeGmailMessage(
      connection,
      await (await request(url.toString())).json(),
    );
  }));
  return messages.filter((message): message is MailMessage => Boolean(message));
}

async function outlookMessages(connection: MailboxConnectionDocument) {
  const request = mailboxRequest(connection);
  const url = new URL(
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages",
  );
  url.searchParams.set("$filter", "isRead eq false");
  url.searchParams.set("$top", "25");
  url.searchParams.set(
    "$select",
    "id,subject,from,receivedDateTime,bodyPreview",
  );
  const value: unknown = await (await request(url.toString())).json();
  const messages = value && typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>).value)
    ? (value as { value: unknown[] }).value
    : [];
  return messages
    .map((message) => normalizeOutlookMessage(connection, message))
    .filter((message): message is MailMessage => Boolean(message));
}

export function loadUnreadMailboxMessages(
  connection: MailboxConnectionDocument,
) {
  return connection.source === "gmail"
    ? gmailMessages(connection)
    : outlookMessages(connection);
}

export async function markMailboxMessageRead(
  connection: MailboxConnectionDocument,
  messageId: string,
) {
  const request = mailboxRequest(connection);
  if (connection.source === "gmail") {
    await request(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/modify`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      },
    );
    return;
  }
  await request(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    },
  );
}
