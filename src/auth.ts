import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { cookies } from "next/headers";

import {
  ACCOUNT_LINK_COOKIE,
  resolveAccountLink,
} from "@/services/account-link-service";
import {
  resolveCanonicalUserId,
  resolveUserId,
} from "@/services/user-identity";
import {
  connectMailboxFromOAuth,
  mailboxSessionUserId,
} from "@/services/mailbox-oauth";
import { isAuthProvider } from "@/utils/auth-provider";
import { isUuid } from "@/utils/id";
import { isMailboxSource } from "@/utils/mailbox";

const discardProviderTokens = () => ({});

export const { handlers, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user" } },
      userinfo: "https://api.github.com/user",
      profile(profile) {
        return { id: String(profile.id) };
      },
      account: discardProviderTokens,
    }),
    Google({
      profile(profile) {
        return { id: profile.sub };
      },
      account: discardProviderTokens,
    }),
    MicrosoftEntraID({
      issuer: "https://login.microsoftonline.com/common/v2.0",
      authorization: { params: { scope: "openid profile email" } },
      profile(profile) {
        return { id: profile.sub };
      },
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
        await connectMailboxFromOAuth(
          "gmail",
          profile.sub,
          profile.email,
          tokens,
        );
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
      issuer: "https://login.microsoftonline.com/common/v2.0",
      authorization: {
        params: {
          scope: "openid profile email offline_access User.Read Mail.ReadWrite",
          prompt: "select_account",
        },
      },
      async profile(profile, tokens) {
        await connectMailboxFromOAuth(
          "outlook",
          profile.sub,
          profile.email ?? profile.preferred_username,
          tokens,
        );
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email ?? profile.preferred_username,
        };
      },
      account: discardProviderTokens,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      let id = null;
      if (account) {
        if (isMailboxSource(account.provider)) {
          id = await mailboxSessionUserId(
            account.provider,
            account.providerAccountId,
          );
        } else {
          if (!isAuthProvider(account.provider)) return null;
          const linkToken = (await cookies()).get(ACCOUNT_LINK_COOKIE)?.value;
          id = linkToken
            ? await resolveAccountLink(
                linkToken,
                account.provider,
                account.providerAccountId,
              )
            : null;
          id ??= await resolveUserId(account.provider, account.providerAccountId);
        }
      } else if (typeof token.sub === "string" && isUuid(token.sub)) {
        id = await resolveCanonicalUserId(token.sub);
      }
      return id ? { sub: id } : null;
    },
    session({ session, token }) {
      return {
        expires: session.expires,
        user: { id: String(token.sub) },
      };
    },
  },
});
