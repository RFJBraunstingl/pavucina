import { cookies } from "next/headers";

import { auth } from "@/auth";
import {
  ACCOUNT_LINK_COOKIE,
  ACCOUNT_LINK_MAX_AGE,
  cancelAccountLinkRequest,
  confirmAccountLink,
  createAccountLinkRequest,
  loadAccountLinkRequest,
} from "@/services/account/link/account-link-service";
import { listLinkedProviders } from "@/services/account/auth/user-identity";
import { isAuthProvider } from "@/utils/account/auth-provider";

async function currentUserId() {
  return (await auth())?.user.id ?? null;
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function clearLinkCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.delete(ACCOUNT_LINK_COOKIE);
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required", 401);

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCOUNT_LINK_COOKIE)?.value;
  const request = token
    ? await loadAccountLinkRequest(token, userId)
    : null;
  if (token && !request) clearLinkCookie(cookieStore);
  return Response.json({
    accounts: await listLinkedProviders(userId),
    request: request
      ? { provider: request.provider, state: request.state }
      : null,
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required", 401);

  const value: unknown = await request.json().catch(() => null);
  const provider = value && typeof value === "object" && "provider" in value
    ? value.provider
    : null;
  if (!isAuthProvider(provider)) return error("Invalid provider", 400);

  const cookieStore = await cookies();
  const previousToken = cookieStore.get(ACCOUNT_LINK_COOKIE)?.value;
  if (previousToken) {
    await cancelAccountLinkRequest(previousToken, userId);
  }
  const token = await createAccountLinkRequest(userId, provider);
  cookieStore.set(ACCOUNT_LINK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCOUNT_LINK_MAX_AGE,
  });
  return new Response(null, { status: 204 });
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required", 401);

  const value: unknown = await request.json().catch(() => null);
  if (
    !value ||
    typeof value !== "object" ||
    !("confirmOverwrite" in value) ||
    value.confirmOverwrite !== true
  ) {
    return error("Overwrite confirmation required", 400);
  }
  const token = (await cookies()).get(ACCOUNT_LINK_COOKIE)?.value;
  if (!token || !(await confirmAccountLink(token, userId))) {
    return error("No account-link conflict to confirm", 409);
  }
  return new Response(null, { status: 204 });
}

export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required", 401);

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCOUNT_LINK_COOKIE)?.value;
  if (token) await cancelAccountLinkRequest(token, userId);
  clearLinkCookie(cookieStore);
  return new Response(null, { status: 204 });
}
