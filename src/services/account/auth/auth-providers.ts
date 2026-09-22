import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { connectCalendarFromOAuth } from "@/services/calendar/providers/calendar-oauth";
import { connectMailboxFromOAuth } from "@/services/mailbox/providers/mailbox-oauth";

const discardProviderTokens = () => ({});

export const authProviders: NextAuthConfig["providers"] = [
  GitHub({
    authorization: { params: { scope: "read:user" } },
    userinfo: "https://api.github.com/user",
    profile: (profile) => ({ id: String(profile.id) }),
    account: discardProviderTokens,
  }),
  Google({
    profile: (profile) => ({ id: profile.sub }),
    account: discardProviderTokens,
  }),
  MicrosoftEntraID({
    issuer: "https://login.microsoftonline.com/common/v2.0",
    authorization: { params: { scope: "openid profile email" } },
    profile: (profile) => ({ id: profile.sub }),
    account: discardProviderTokens,
  }),
  Google({
    id: "gmail",
    name: "Gmail",
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    authorization: {
      params: {
        scope: "openid email profile https://www.googleapis.com/auth/gmail.modify",
        access_type: "offline",
        include_granted_scopes: "true",
        prompt: "consent select_account",
      },
    },
    async profile(profile, tokens) {
      await connectMailboxFromOAuth("gmail", profile.sub, profile.email, tokens);
      return { id: profile.sub, name: profile.name, email: profile.email };
    },
    account: discardProviderTokens,
  }),
  MicrosoftEntraID({
    id: "outlook",
    name: "Outlook",
    clientId:
      process.env.AUTH_OUTLOOK_ID ?? process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    clientSecret:
      process.env.AUTH_OUTLOOK_SECRET ??
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
    issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER_OUTLOOK,
    authorization: {
      params: {
        scope: "openid profile email offline_access User.Read Mail.ReadWrite",
        prompt: "select_account",
      },
    },
    async profile(profile, tokens) {
      const email = profile.email ?? profile.preferred_username;
      await connectMailboxFromOAuth("outlook", profile.sub, email, tokens);
      return { id: profile.sub, name: profile.name, email };
    },
    account: discardProviderTokens,
  }),
  Google({
    id: "google-calendar",
    name: "Google Calendar",
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    authorization: {
      params: {
        scope: [
          "openid email profile",
          "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
          "https://www.googleapis.com/auth/calendar.events.readonly",
        ].join(" "),
        access_type: "offline",
        prompt: "consent select_account",
      },
    },
    async profile(profile, tokens) {
      await connectCalendarFromOAuth("google", profile.sub, profile.email, tokens);
      return { id: profile.sub, name: profile.name, email: profile.email };
    },
    account: discardProviderTokens,
  }),
  MicrosoftEntraID({
    id: "outlook-calendar",
    name: "Outlook Calendar",
    clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
    issuer: "https://login.microsoftonline.com/common/v2.0",
    authorization: {
      params: {
        scope: "openid profile email offline_access User.Read Calendars.Read.Shared",
        prompt: "select_account",
      },
    },
    async profile(profile, tokens) {
      const email = profile.email ?? profile.preferred_username;
      await connectCalendarFromOAuth("outlook", profile.sub, email, tokens);
      return { id: profile.sub, name: profile.name, email };
    },
    account: discardProviderTokens,
  }),
];
