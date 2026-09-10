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
import { isAuthProvider } from "@/utils/auth-provider";
import { isUuid } from "@/utils/id";

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
  ],
  callbacks: {
    async jwt({ token, account }) {
      let id = null;
      if (account) {
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
