export type AuthProvider = "github" | "google";

export type UserIdentityDocument = {
  _id: string;
  provider: AuthProvider;
  providerAccountId: string;
};
