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
      </div>
    </header>
  );
}
