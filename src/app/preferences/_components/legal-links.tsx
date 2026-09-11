import Link from "next/link";

const LINKS = [
  ["Privacy Policy", "/privacy"],
  ["Terms of Service", "/terms"],
  ["Imprint", "/imprint"],
] as const;

export default function LegalLinks() {
  return (
    <section className="preferences-card" aria-labelledby="legal-links-heading">
      <header>
        <p className="eyebrow">About</p>
        <h2 id="legal-links-heading">Legal</h2>
      </header>
      <nav className="legal-link-list" aria-label="Legal information">
        {LINKS.map(([label, href]) => (
          <Link href={href} key={href}>{label}</Link>
        ))}
      </nav>
    </section>
  );
}
