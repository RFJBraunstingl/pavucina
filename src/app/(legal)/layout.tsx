import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="legal-shell">
      <header className="legal-header">
        <Link className="legal-brand" href="/">
          <Image src="/pavucina-logo.svg" width={28} height={28} alt="" />
          <span>Pavucina</span>
        </Link>
        <nav aria-label="About and legal information">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/imprint">Imprint</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
