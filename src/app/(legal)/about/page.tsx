import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About · Pavucina",
  description: "What Pavucina is and an overview of its task-management pages.",
};

export default function AboutPage() {
  return (
    <main className="legal-card">
      <header>
        <p className="eyebrow">About</p>
        <h1>Pavucina</h1>
        <p>A task manager built around a hierarchical knowledge graph.</p>
      </header>

      <section>
        <h2>What is Pavucina?</h2>
        <p>
          Pavucina helps you capture tasks, arrange them into projects, plan
          dates and times, and complete the work from a daily checklist.
        </p>
        <p>
          It works without an account by storing data in your browser. Signing
          in with GitHub, Google, or Microsoft stores and synchronizes your
          workspace on the Pavucina server.
        </p>
      </section>

      <section>
        <h2>Explore Pavucina</h2>
        <ul>
          <li><Link href="/inbox">Inbox</Link> — capture tasks manually or from Gmail and Outlook.</li>
          <li><Link href="/timeline">Timeline</Link> — organize the task hierarchy and plan date ranges.</li>
          <li><Link href="/calendar">Calendar</Link> — plan tasks by time and overlay external calendars.</li>
          <li><Link href="/todo">ToDo</Link> — complete the leaf tasks scheduled for today.</li>
          <li><Link href="/preferences">Preferences</Link> — configure scheduling, accounts, and backups.</li>
        </ul>
      </section>

      <section>
        <h2>Your privacy</h2>
        <p>
          Learn how local workspaces, synchronized data, and optional mailbox
          and calendar connections are handled in the <Link href="/privacy">
          Privacy Policy</Link>.
        </p>
      </section>
    </main>
  );
}
