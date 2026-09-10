import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { resolveUserId } from "@/services/user-identity";
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
  ],
  callbacks: {
    async jwt({ token, account }) {
      const id = account
        ? await resolveUserId(account.provider, account.providerAccountId)
        : typeof token.sub === "string" && isUuid(token.sub)
          ? token.sub
          : null;
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
