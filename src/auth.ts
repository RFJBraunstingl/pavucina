import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user" } },
      userinfo: "https://api.github.com/user",
      profile(profile) {
        return { id: String(profile.id) };
      },
      account() {
        return {};
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, profile }) {
      const id = profile?.id ?? token.sub;
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
