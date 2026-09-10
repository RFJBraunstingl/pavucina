import type { AuthProvider } from "@/types/user-storage";

export const AUTH_PROVIDERS: AuthProvider[] = [
  "github",
  "google",
  "microsoft-entra-id",
];

export function isAuthProvider(value: unknown): value is AuthProvider {
  return (
    typeof value === "string" &&
    AUTH_PROVIDERS.includes(value as AuthProvider)
  );
}

export function authProviderLabel(provider: AuthProvider) {
  if (provider === "github") return "GitHub";
  if (provider === "google") return "Google";
  return "Microsoft";
}
