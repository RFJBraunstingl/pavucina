import Link from "next/link";
import type { AppVersionProps } from "@/types/preferences/preferences-components";

const LINKS = [
  ["About", "/about"],
  ["Privacy Policy", "/privacy"],
  ["Terms of Service", "/terms"],
  ["Imprint", "/imprint"],
] as const;

export default function LegalLinks({ version }: AppVersionProps) {
  return (
    <section className="preferences-card" aria-labelledby="legal-links-heading">
      <header>
        <p className="eyebrow">Information</p>
        <h2 id="legal-links-heading">About &amp; legal</h2>
      </header>
      <nav className="legal-link-list" aria-label="About and legal information">
        {LINKS.map(([label, href]) => (
          <Link href={href} key={href}>{label}</Link>
        ))}
      </nav>
      <footer className="preferences-version">Pavucina version {version}</footer>
    </section>
  );
}
