"use client";

import { useRef } from "react";

import AuthProviderButtons from "@/app/_components/auth/auth-provider-buttons";
import { useAccountLinks } from "./use-account-links";
import { authProviderLabel } from "@/utils/account/auth-provider";

export default function AccountLinks() {
  const dialog = useRef<HTMLDialogElement>(null);
  const { status, links, busy, message, link, resolveConflict } =
    useAccountLinks();

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
          <AuthProviderButtons
            disabled={busy}
            onSelect={(provider) =>
              void link(provider, () => dialog.current?.close())}
          />
          <div className="dialog-actions">
            <button type="submit">Close</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
