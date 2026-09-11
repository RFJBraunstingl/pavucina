import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · Pavucina",
  description: "Terms for using the free Pavucina task-management service.",
};

export default function TermsPage() {
  return (
    <main className="legal-card">
      <header>
        <p className="eyebrow">Legal</p>
        <h1>Terms of Service</h1>
        <p>Last updated 11 September 2026</p>
      </header>

      <section>
        <h2>About the service</h2>
        <p>
          Pavucina is a free, non-commercial task-management project operated
          by Roman Braunstingl in Vienna, Austria. By using Pavucina, you agree
          to these terms. You may stop using it at any time.
        </p>
      </section>

      <section>
        <h2>Your data and connected accounts</h2>
        <p>
          You keep all rights to your content and permit Pavucina to process it
          only as needed to provide the service. You are responsible for your
          content and must be authorized to connect any account you use.
          GitHub, Google, and Microsoft services remain subject to their own
          terms. See the <Link href="/privacy">Privacy Policy</Link> for details.
        </p>
      </section>

      <section>
        <h2>Fair use</h2>
        <p>You must not:</p>
        <ul>
          <li>use Pavucina unlawfully or maliciously;</li>
          <li>probe, bypass, or interfere with its security;</li>
          <li>access another person’s workspace or connected account; or</li>
          <li>generate automated traffic or otherwise consume unreasonable resources.</li>
        </ul>
        <p>
          The operator may restrict, suspend, or revoke access when reasonably
          necessary to stop abuse, protect security, or enforce fair use.
          Notice will be given where practical, but urgent threats may be
          blocked immediately.
        </p>
      </section>

      <section>
        <h2>Availability and changes</h2>
        <p>
          Pavucina may change, experience interruptions, or be discontinued
          for technical, security, legal, or resource reasons. Reasonable
          notice of material changes will be provided where practical. Export
          your workspace regularly if losing it would matter to you.
        </p>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          Pavucina is provided “as is” and “as available,” without promises
          that it will be uninterrupted, error-free, secure, suitable for a
          particular purpose, or preserve your data. To the fullest extent
          permitted by law, the operator disclaims warranties and liability
          arising from use of the service.
        </p>
        <p>
          Nothing in these terms excludes mandatory consumer rights or
          liability that cannot legally be excluded, including liability for
          intentional or grossly negligent conduct or injury to life, body, or
          health.
        </p>
      </section>

      <section>
        <h2>Source-code license</h2>
        <p>
          The source code is available on <a
          href="https://github.com/RFJBraunstingl/pavucina">GitHub</a> under
          the <a href="https://github.com/RFJBraunstingl/pavucina/blob/main/LICENSE.md">
          Functional Source License 1.1 with an Apache 2.0 Future License</a>.
          It permits self-hosting, modification, and redistribution, but not a
          competing commercial service. Each version becomes available under
          Apache 2.0 two years after that version is released.
        </p>
      </section>

      <section>
        <h2>Ending use and applicable law</h2>
        <p>
          You may request deletion at <a href="mailto:rfj.braunstingl@gmail.com">
          rfj.braunstingl@gmail.com</a>. Austrian law applies, without removing
          any mandatory protections or statutory venue rights available to
          consumers in the European Union.
        </p>
      </section>
    </main>
  );
}
