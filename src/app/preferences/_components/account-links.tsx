"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";

import AuthProviderButtons from "../../_components/auth-provider-buttons";
import {
  clearAccountLink,
  confirmAccountLinkOverwrite,
  loadAccountLinks,
  startAccountLink,
} from "@/services/remote-account-link-store";
import { authProviderLabel } from "@/utils/auth-provider";
import type {
  AccountLinksResponse,
  AuthProvider,
} from "@/types/user-storage";

export default function AccountLinks() {
  const { status } = useSession();
  const dialog = useRef<HTMLDialogElement>(null);
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
          setMessage(
            error instanceof Error ? error.message : "Could not load accounts",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function link(provider: AuthProvider) {
    setBusy(true);
    setMessage(null);
    try {
      await startAccountLink(provider);
      dialog.current?.close();
      await signIn(
        provider,
        { redirectTo: "/preferences?accountLink=return" },
        provider === "github" ? undefined : { prompt: "select_account" },
      );
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Could not link account",
      );
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
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Could not update account link",
      );
    } finally {
      setBusy(false);
    }
  }

  const accounts = links?.accounts.map(authProviderLabel).join(", ");
  const conflict = links?.request?.state === "conflict"
    ? links.request.provider
    : null;

  return (
    <section
      className="preferences-card account-links"
      aria-labelledby="account-links-heading"
    >
      <header>
        <p className="eyebrow">Account</p>
        <h2 id="account-links-heading">Connected accounts</h2>
      </header>
      {status === "authenticated" ? (
        <>
          <p>{accounts ? `Connected: ${accounts}.` : "Loading connected accounts…"}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => dialog.current?.showModal()}
          >
            Link another account
          </button>
        </>
      ) : (
        <p>Sign in before linking another account to this workspace.</p>
      )}
      {conflict && (
        <div className="account-link-conflict" role="alert">
          <strong>{authProviderLabel(conflict)} already has a workspace.</strong>
          <p>
            Linking will permanently replace its graph, scratchpad, history,
            settings, mailbox connections, and calendar connections with the
            workspace currently open.
          </p>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void resolveConflict(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void resolveConflict(true)}
            >
              Overwrite and link
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className="account-link-message" role="status">{message}</p>
      )}
      <dialog
        ref={dialog}
        className="app-dialog auth-dialog"
        aria-labelledby="link-dialog-heading"
      >
        <form method="dialog">
          <h2 id="link-dialog-heading">Link another account</h2>
          <p>Sign in to an account that should share this workspace.</p>
          <AuthProviderButtons disabled={busy} onSelect={link} />
          <div className="dialog-actions">
            <button type="submit">Close</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
