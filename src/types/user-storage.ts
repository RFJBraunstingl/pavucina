export type AuthProvider = "github" | "google" | "microsoft-entra-id";

export type UserIdentityDocument = {
  _id: string;
  userId?: string;
  provider: AuthProvider;
  providerAccountId: string;
};

export type AccountLinkState = "pending" | "conflict" | "complete";

export type AccountLinkRequestDocument = {
  _id: string;
  sourceUserId: string;
  provider: AuthProvider;
  state: AccountLinkState;
  targetUserId?: string;
  expiresAt: Date;
};

export type AccountLinksResponse = {
  accounts: AuthProvider[];
  request: {
    provider: AuthProvider;
    state: AccountLinkState;
  } | null;
};
