export type OAuthCredentials = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type OAuthRequest = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;
