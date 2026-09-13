import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

import type { OAuthCredentials } from "@/types/oauth";

export class OAuthRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(`${message} (${status})`);
    this.status = status;
  }
}

function key(context: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(context).digest();
}

export function sealOAuthValue(value: unknown, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(context), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function openOAuthValue(value: string, context: string): unknown {
  const parts = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (parts.length !== 3 || parts[0].length !== 12 || parts[1].length !== 16) {
    throw new Error("Invalid encrypted OAuth data");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(context), parts[0]);
  decipher.setAuthTag(parts[1]);
  const decrypted = Buffer.concat([
    decipher.update(parts[2]),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

export function openOAuthCredentials(value: string, context: string) {
  const credentials = openOAuthValue(value, context) as Record<string, unknown>;
  if (
    typeof credentials.accessToken !== "string" ||
    (credentials.refreshToken !== undefined &&
      typeof credentials.refreshToken !== "string") ||
    (credentials.expiresAt !== undefined &&
      typeof credentials.expiresAt !== "number")
  ) throw new Error("Stored OAuth credentials are invalid");
  return credentials as OAuthCredentials;
}

export function createOAuthRequest(
  initialCredentials: OAuthCredentials,
  refresh: (credentials: OAuthCredentials) => Promise<OAuthCredentials>,
  errorLabel: string,
) {
  let credentials = initialCredentials;
  let refreshPromise: Promise<OAuthCredentials> | null = null;
  const refreshOnce = async () => {
    const pendingRefresh = (refreshPromise ??= refresh(credentials));
    try {
      credentials = await pendingRefresh;
    } finally {
      if (refreshPromise === pendingRefresh) refreshPromise = null;
    }
  };
  return async (url: string, init?: RequestInit) => {
    const send = async (forceRefresh = false) => {
      if (
        forceRefresh ||
        (credentials.expiresAt !== undefined &&
          credentials.expiresAt <= Date.now() + 60_000)
      ) await refreshOnce();
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${credentials.accessToken}`);
      return fetch(url, { ...init, headers });
    };
    let response = await send();
    if (response.status === 401) response = await send(true);
    if (!response.ok) throw new OAuthRequestError(errorLabel, response.status);
    return response;
  };
}
