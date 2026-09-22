import type {
  OAuthCredentials,
  OAuthRefreshConfig,
} from "@/types/auth/oauth";

export async function refreshOAuthCredentials(
  credentials: OAuthCredentials,
  config: OAuthRefreshConfig,
  reconnectMessage: string,
) {
  if (!config.clientId || !config.clientSecret || !credentials.refreshToken) {
    throw new Error(reconnectMessage);
  }
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: credentials.refreshToken,
  });
  if (config.scope) body.set("scope", config.scope);
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
    throw new Error(reconnectMessage);
  }
  return {
    accessToken: token.access_token,
    refreshToken: typeof token.refresh_token === "string"
      ? token.refresh_token
      : credentials.refreshToken,
    expiresAt: Date.now() +
      (typeof token.expires_in === "number" ? token.expires_in : 3600) * 1_000,
  };
}
