import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Imprint · Pavucina",
  description: "Operator and media-owner information for Pavucina.",
};

export default function ImprintPage() {
  return (
    <main className="legal-card">
      <header>
        <p className="eyebrow">Legal</p>
        <h1>Imprint</h1>
        <p>Information under § 25 Austrian Media Act</p>
      </header>

      <section>
        <h2>Operator and media owner</h2>
        <address>
          Roman Braunstingl<br />
          Vienna, Austria<br />
          <a href="mailto:rfj.braunstingl@gmail.com">
            rfj.braunstingl@gmail.com
          </a>
        </address>
      </section>

      <section>
        <h2>Project</h2>
        <p>
          Pavucina is a strictly non-commercial student project providing a
          task-management application and information about its development.
        </p>
        <p>
          Source code and project information: <a
          href="https://github.com/RFJBraunstingl">RFJBraunstingl on GitHub</a>.
        </p>
      </section>

      <section>
        <h2>Editorial purpose</h2>
        <p>
          Provision and documentation of Pavucina and its task-management
          features. The site contains no advertising or sponsored content.
        </p>
      </section>
    </main>
  );
}
