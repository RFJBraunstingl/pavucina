import { openOAuthValue } from "./oauth-crypto";
import { isUuid } from "@/utils/shared/id.ts";
import type {
  OAuthConnectRequest,
  OAuthCredentials,
} from "@/types/auth/oauth";

export class OAuthRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(`${message} (${status})`);
    this.status = status;
  }
}

export function readOAuthConnectRequest<Source extends string>(
  value: string | undefined,
  context: string,
  isSource: (source: unknown) => source is Source,
): OAuthConnectRequest<Source> | null {
  if (!value) return null;
  try {
    const request = openOAuthValue(value, context);
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      return null;
    }
    const fields = request as Record<string, unknown>;
    if (
      !isSource(fields.source) ||
      (fields.userId !== undefined &&
        (typeof fields.userId !== "string" || !isUuid(fields.userId))) ||
      typeof fields.expiresAt !== "number" ||
      fields.expiresAt < Date.now()
    ) return null;
    return fields as OAuthConnectRequest<Source>;
  } catch {
    return null;
  }
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
