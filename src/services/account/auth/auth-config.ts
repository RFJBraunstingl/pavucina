import type { NextAuthConfig } from "next-auth";

import { authCallbacks } from "./auth-callbacks";
import { authProviders } from "./auth-providers";

export const authConfig = {
  session: { strategy: "jwt" },
  providers: authProviders,
  callbacks: authCallbacks,
} satisfies NextAuthConfig;
