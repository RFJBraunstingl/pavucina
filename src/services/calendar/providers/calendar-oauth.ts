import "server-only";

import { cookies } from "next/headers";

import {
  findCalendarConnectionByAccount,
  saveCalendarConnection,
} from "./calendar-repository";
import { readOAuthConnectRequest } from "@/services/http/oauth/oauth-client";
import {
  openOAuthCredentials,
  sealOAuthValue,
} from "@/services/http/oauth/oauth-crypto";
import { resolveUserId } from "@/services/account/auth/user-identity";
import { calendarAuthProvider, isCalendarSource } from "@/utils/calendar/events/external-calendar-source";
import type { OAuthProviderTokens } from "@/types/auth/oauth";
import type {
  CalendarCredentials,
  CalendarSource,
} from "@/types/calendar/events/external-calendar";

export const CALENDAR_CONNECT_COOKIE = "pavucina.calendar-connect";
export const CALENDAR_CONNECT_MAX_AGE = 10 * 60;
const CONNECT_CONTEXT = "calendar-connect";
const CREDENTIAL_CONTEXT = "calendar-credentials";

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

export function readCalendarConnectRequest(value?: string) {
  return readOAuthConnectRequest(value, CONNECT_CONTEXT, isCalendarSource);
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
  tokens: OAuthProviderTokens,
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
