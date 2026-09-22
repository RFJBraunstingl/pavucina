import { cookies } from "next/headers";
import type { NextAuthConfig } from "next-auth";

import {
  ACCOUNT_LINK_COOKIE,
  resolveAccountLink,
} from "../link/account-link-service";
import { resolveCanonicalUserId, resolveUserId } from "./user-identity";
import {
  calendarSessionUserId,
  calendarSourceFromAuthProvider,
  isCalendarAuthProvider,
} from "@/services/calendar/providers/calendar-oauth";
import { mailboxSessionUserId } from "@/services/mailbox/providers/mailbox-oauth";
import { isAuthProvider } from "@/utils/account/auth-provider";
import { isUuid } from "@/utils/shared/id";
import { isMailboxSource } from "@/utils/mailbox";

export const authCallbacks: NonNullable<NextAuthConfig["callbacks"]> = {
  async jwt({ token, account }) {
    let userId = null;
    if (account && isCalendarAuthProvider(account.provider)) {
      userId = await calendarSessionUserId(
        calendarSourceFromAuthProvider(account.provider),
        account.providerAccountId,
      );
    } else if (account && isMailboxSource(account.provider)) {
      userId = await mailboxSessionUserId(
        account.provider,
        account.providerAccountId,
      );
    } else if (account) {
      if (!isAuthProvider(account.provider)) return null;
      const linkToken = (await cookies()).get(ACCOUNT_LINK_COOKIE)?.value;
      userId = linkToken
        ? await resolveAccountLink(
            linkToken,
            account.provider,
            account.providerAccountId,
          )
        : null;
      userId ??= await resolveUserId(account.provider, account.providerAccountId);
    } else if (typeof token.sub === "string" && isUuid(token.sub)) {
      userId = await resolveCanonicalUserId(token.sub);
    }
    return userId ? { sub: userId } : null;
  },
  session({ session, token }) {
    return {
      expires: session.expires,
      user: { id: String(token.sub) },
    };
  },
};
