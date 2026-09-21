import NextAuth from "next-auth";

import { authConfig } from "@/services/account/auth/auth-config";

export const { handlers, auth } = NextAuth(authConfig);
