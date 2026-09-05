import Link from "next/link";
import Image from "next/image";

import AuthControls from "./auth-controls";
import type { AppHeaderProps } from "@/types/navigation";

export default function AppHeader({ active, title }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <Image
          className="brand-logo"
          src="/pavucina-logo.svg"
          width={28}
          height={28}
          alt=""
        />
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
        <AuthControls />
        <Link
          href="/preferences"
          className="preferences-link"
          aria-label="Preferences"
          aria-current={active === "preferences" ? "page" : undefined}
          title="Preferences"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
