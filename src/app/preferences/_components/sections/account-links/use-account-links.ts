import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";

import {
  clearAccountLink,
  confirmAccountLinkOverwrite,
  loadAccountLinks,
  startAccountLink,
} from "@/services/account/link/remote-account-link-store";
import type {
  AccountLinksResponse,
  AuthProvider,
} from "@/types/account/user-storage";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useAccountLinks() {
  const { status } = useSession();
  const [links, setLinks] = useState<AccountLinksResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void loadAccountLinks()
      .then((value) => {
        if (cancelled) return;
        setLinks(value);
        if (value.request?.state === "complete") {
          setMessage("Account linked.");
          void clearAccountLink().catch(() => undefined);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(errorMessage(error, "Could not load accounts"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function link(provider: AuthProvider, onStarted: () => void) {
    setBusy(true);
    setMessage(null);
    try {
      await startAccountLink(provider);
      onStarted();
      await signIn(
        provider,
        { redirectTo: "/preferences?accountLink=return" },
        provider === "github" ? undefined : { prompt: "select_account" },
      );
    } catch (error) {
      setMessage(errorMessage(error, "Could not link account"));
      setBusy(false);
    }
  }

  async function resolveConflict(confirm: boolean) {
    setBusy(true);
    try {
      if (confirm) await confirmAccountLinkOverwrite();
      await clearAccountLink();
      setLinks(await loadAccountLinks());
      setMessage(confirm ? "Account linked." : "Account linking cancelled.");
    } catch (error) {
      setMessage(errorMessage(error, "Could not update account link"));
    } finally {
      setBusy(false);
    }
  }

  return { status, links, busy, message, link, resolveConflict };
}
