import "server-only";

import { cookies } from "next/headers";

import {
  findCalendarConnectionByAccount,
  saveCalendarConnection,
} from "./calendar-repository";
import {
  openOAuthCredentials,
  openOAuthValue,
  sealOAuthValue,
} from "@/services/http/oauth-client";
import { resolveUserId } from "@/services/account/auth/user-identity";
import { calendarAuthProvider, isCalendarSource } from "@/utils/calendar/events/external-calendar";
import { isUuid } from "@/utils/shared/id";
import type {
  CalendarCredentials,
  CalendarSource,
} from "@/types/calendar/events/external-calendar";

export const CALENDAR_CONNECT_COOKIE = "pavucina.calendar-connect";
export const CALENDAR_CONNECT_MAX_AGE = 10 * 60;
const CONNECT_CONTEXT = "calendar-connect";
const CREDENTIAL_CONTEXT = "calendar-credentials";

type ConnectRequest = {
  source: CalendarSource;
  userId?: string;
  expiresAt: number;
};

type OAuthTokens = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

export function createCalendarConnectRequest(
  source: CalendarSource,
  userId?: string,
) {
  return sealOAuthValue({
    source,
    userId,
    expiresAt: Date.now() + CALENDAR_CONNECT_MAX_AGE * 1_000,
  }, CONNECT_CONTEXT);
}

export function readCalendarConnectRequest(value?: string): ConnectRequest | null {
  if (!value) return null;
  try {
    const request = openOAuthValue(value, CONNECT_CONTEXT) as Record<string, unknown>;
    if (
      !isCalendarSource(request.source) ||
      (request.userId !== undefined &&
        (typeof request.userId !== "string" || !isUuid(request.userId))) ||
      typeof request.expiresAt !== "number" ||
      request.expiresAt < Date.now()
    ) return null;
    return request as ConnectRequest;
  } catch {
    return null;
  }
}

export function sealCalendarCredentials(credentials: CalendarCredentials) {
  return sealOAuthValue(credentials, CREDENTIAL_CONTEXT);
}

export function openCalendarCredentials(value: string) {
  return openOAuthCredentials(value, CREDENTIAL_CONTEXT);
}

async function targetUserId(
  source: CalendarSource,
  providerAccountId: string,
) {
  const value = (await cookies()).get(CALENDAR_CONNECT_COOKIE)?.value;
  const request = readCalendarConnectRequest(value);
  if (!request || request.source !== source) {
    throw new Error("Calendar connection request is missing or expired");
  }
  const provider = source === "google" ? "google" : "microsoft-entra-id";
  return request.userId ?? resolveUserId(provider, providerAccountId);
}

export async function connectCalendarFromOAuth(
  source: CalendarSource,
  providerAccountId: string,
  address: string,
  tokens: OAuthTokens,
) {
  if (!tokens.access_token) throw new Error("Calendar access was not granted");
  const userId = await targetUserId(source, providerAccountId);
  const existing = await findCalendarConnectionByAccount(
    userId,
    source,
    providerAccountId,
  );
  const previous = existing
    ? openCalendarCredentials(existing.credentials)
    : undefined;
  await saveCalendarConnection(
    userId,
    source,
    providerAccountId,
    address || providerAccountId,
    sealCalendarCredentials({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? previous?.refreshToken,
      expiresAt: tokens.expires_at ? tokens.expires_at * 1_000 : undefined,
    }),
  );
}

export function calendarSessionUserId(
  source: CalendarSource,
  providerAccountId: string,
) {
  return targetUserId(source, providerAccountId);
}

export function isCalendarAuthProvider(value: string) {
  return ["google", "outlook"].some(
    (source) => calendarAuthProvider(source as CalendarSource) === value,
  );
}

export function calendarSourceFromAuthProvider(value: string): CalendarSource {
  return value === "google-calendar" ? "google" : "outlook";
}
