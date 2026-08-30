"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

import type { AppHeaderProps } from "@/types/navigation";

export default function AppHeader({ active, title }: AppHeaderProps) {
  const { status } = useSession();

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <span>Pavucina</span>
      </div>
      <div>
        <p className="eyebrow">Workspace</p>
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <nav className="app-nav" aria-label="Views">
          <Link href="/" aria-current={active === "timeline" ? "page" : undefined}>
            Timeline
          </Link>
          <Link
            href="/calendar"
            aria-current={active === "calendar" ? "page" : undefined}
          >
            Calendar
          </Link>
          <Link href="/todo" aria-current={active === "todo" ? "page" : undefined}>
            ToDo
          </Link>
        </nav>
        <div className="auth-controls">
          {status === "authenticated" ? (
            <>
              <span>Signed in</span>
              <button type="button" onClick={() => void signOut()}>Sign out</button>
            </>
          ) : (
            <button
              type="button"
              disabled={status === "loading"}
              onClick={() => void signIn("github")}
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
