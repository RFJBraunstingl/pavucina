import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Pavucina",
  description: "How Pavucina handles task, account, mailbox, and calendar data.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-card">
      <header>
        <p className="eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p>Last updated 13 September 2026</p>
      </header>

      <section>
        <h2>Who is responsible?</h2>
        <p>
          Roman Braunstingl, Vienna, Austria, operates Pavucina and is the data
          controller. Contact <a href="mailto:rfj.braunstingl@gmail.com">
          rfj.braunstingl@gmail.com</a> for privacy questions or requests.
        </p>
      </section>

      <section>
        <h2>What Pavucina does</h2>
        <p>
          Pavucina is a non-commercial task manager. It stores tasks in a
          hierarchical graph and provides an inbox, scheduling, calendar, and
          optional Gmail, Outlook, Google Calendar, and Outlook Calendar
          connections. It has no advertising, analytics, or user profiling.
        </p>
      </section>

      <section>
        <h2>Data processed</h2>
        <p>
          Guest tasks and preferences stay in your browser. If you sign in,
          Pavucina stores an internal user ID, the login provider and its
          immutable account ID, your tasks, scratchpad, graph history, and
          settings on the Pavucina server. Normal sign-in does not retain your
          name, email address, profile, or provider tokens.
        </p>
        <p>
          An optional mailbox or calendar connection stores its account
          address, provider account ID, encrypted OAuth credentials, and
          selected calendar details. Email subjects, senders, previews, and
          calendar events are normally fetched only for display and are not
          stored by themselves. Converting an email into a task stores its
          subject, sender, preview, and source identifiers as task data.
          Pavucina can also mark that message as read at your provider.
        </p>
        <p>
          If you explicitly enable calendar event import in Settings,
          Pavucina stores events from every calendar available through your
          connected calendar accounts, including calendars hidden from the
          Calendar view. Stored event data is limited to the event name,
          description, location, dates, times, all-day status, time zone,
          calendar name and color, source link, provider update time, and the
          source identifiers needed to synchronize it. Start and end dates
          are relationships in your knowledge graph. Attendees, organizers,
          and complete provider payloads are not stored. Synchronization
          cursors are stored with the encrypted calendar connection.
        </p>
      </section>

      <section>
        <h2>Purpose and legal basis</h2>
        <p>
          This data is processed to provide the features you request and sync
          your workspace (Article 6(1)(b) GDPR). Minimal processing needed to
          protect the service and enforce fair use is based on the operator’s
          legitimate interest in a secure, available service (Article 6(1)(f)
          GDPR). Providing data is optional; without signing in, your workspace
          remains local, and integrations work only when you connect them.
        </p>
      </section>

      <section>
        <h2>Storage and retention</h2>
        <ul>
          <li>Browser tasks and preferences remain until you clear them.</li>
          <li>The sign-in session lasts up to 30 days of inactivity.</li>
          <li>OAuth security cookies last for the browser session or up to 15 minutes.</li>
          <li>Connection setup and account-link requests expire after about 10 minutes.</li>
          <li>Server workspaces and their revision history remain until deletion is requested.</li>
          <li>Integration credentials remain until you disconnect or request deletion.</li>
          <li>
            Imported calendar events cover roughly 30 days in the past and
            one year ahead and are updated incrementally. Disabling import or
            disconnecting an account deletes its imported events and their
            stored revision history.
          </li>
        </ul>
        <p>
          The self-hosted service is operated in the EU without analytics,
          access logs, or backups. OAuth credentials are encrypted at rest.
        </p>
      </section>

      <section>
        <h2>Sharing and external services</h2>
        <p>
          Pavucina does not sell your data or disclose stored app data to
          advertisers or unrelated third parties. It exchanges data only with
          the provider you choose for sign-in or an integration: <a
          href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
          GitHub</a>, <a href="https://policies.google.com/privacy">Google</a>,
          or <a href="https://privacy.microsoft.com/privacystatement">Microsoft</a>.
          Those providers may process data outside the EEA under their own
          privacy terms and transfer safeguards.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You may request access, correction, deletion, restriction,
          portability, or object to processing by emailing the address above.
          Settings also lets you export task data and disconnect integrations;
          you may separately revoke access with the provider. There is no
          automated decision-making or profiling.
        </p>
        <p>
          You may complain to the <a href="https://dsb.gv.at/">Austrian Data
          Protection Authority</a>, Barichgasse 40–42, 1030 Vienna, Austria.
        </p>
      </section>
    </main>
  );
}
