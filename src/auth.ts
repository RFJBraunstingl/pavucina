import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { createUserId } from "@/services/user-identity";

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
  ],
  callbacks: {
    jwt({ token, account }) {
      const id = account
        ? createUserId(account.provider, account.providerAccountId)
        : token.sub;
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
