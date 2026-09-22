import type {
  AccountLinksResponse,
  AuthProvider,
} from "@/types/account/user-storage";

async function requireSuccess(response: Response, fallback: string) {
  if (response.ok) return;
  const value: unknown = await response.json().catch(() => null);
  const message =
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
      ? value.error
      : fallback;
  throw new Error(message);
}

export async function loadAccountLinks() {
  const response = await fetch("/api/account-links", { cache: "no-store" });
  await requireSuccess(response, "Could not load connected accounts");
  return response.json() as Promise<AccountLinksResponse>;
}

export async function startAccountLink(provider: AuthProvider) {
  const response = await fetch("/api/account-links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  await requireSuccess(response, "Could not start account linking");
}

export async function confirmAccountLinkOverwrite() {
  const response = await fetch("/api/account-links", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmOverwrite: true }),
  });
  await requireSuccess(response, "Could not link the account");
}

export async function clearAccountLink() {
  const response = await fetch("/api/account-links", { method: "DELETE" });
  await requireSuccess(response, "Could not cancel account linking");
}
