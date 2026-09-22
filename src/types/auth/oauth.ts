export type OAuthCredentials = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type OAuthProviderTokens = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

export type OAuthRefreshConfig = {
  clientId?: string;
  clientSecret?: string;
  tokenUrl: string;
  scope?: string;
};

export type OAuthConnectRequest<Source extends string> = {
  source: Source;
  userId?: string;
  expiresAt: number;
};

export type OAuthRequest = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;
