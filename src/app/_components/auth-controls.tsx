"use client";

import { useRef } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthControls() {
  const dialog = useRef<HTMLDialogElement>(null);
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <div className="auth-controls">
        <span>Signed in</span>
        <button type="button" onClick={() => void signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="auth-controls">
      <button
        type="button"
        disabled={status === "loading"}
        onClick={() => dialog.current?.showModal()}
      >
        Sign in
      </button>
      <dialog
        ref={dialog}
        className="auth-dialog"
        aria-labelledby="auth-dialog-heading"
      >
        <form method="dialog">
          <h2 id="auth-dialog-heading">Sign in to sync</h2>
          <p>Choose how you want to continue.</p>
          <div className="auth-methods">
            <button type="button" autoFocus onClick={() => void signIn("github")}>
              Continue with GitHub
            </button>
            <button type="button" onClick={() => void signIn("google")}>
              Continue with Google
            </button>
          </div>
          <button type="submit" className="auth-dialog-close">Close</button>
        </form>
      </dialog>
    </div>
  );
}
