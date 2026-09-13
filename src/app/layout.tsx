import type { Metadata } from "next";
import Providers from "./_components/providers";
import "./globals.css";
import "./_styles/base.css";
import "./_styles/controls.css";
import "./_styles/dialog.css";
import "./_styles/timeline-grid.css";
import "./_styles/timeline-resize.css";
import "./_styles/timeline-filters.css";
import "./_styles/task-bars.css";
import "./_styles/inspector.css";
import "./_styles/calendar.css";
import "./_styles/calendar-creation.css";
import "./_styles/external-calendar.css";
import "./_styles/schedule.css";
import "./_styles/todo.css";
import "./_styles/todo-dialog.css";
import "./_styles/preferences.css";
import "./_styles/inbox.css";
import "./_styles/mailbox.css";
import "./_styles/mailbox-picker.css";
import "./_styles/scratchpad.css";
import "./_styles/legal.css";
import "./_styles/responsive.css";

export const metadata: Metadata = {
  title: "Pavucina",
  description: "Plan hierarchical tasks on a timeline.",
  icons: {
    icon: {
      url: "/pavucina-logo.svg",
      type: "image/svg+xml",
      sizes: "any",
    },
    apple: {
      url: "/apple-touch-icon.png",
      type: "image/png",
      sizes: "180x180",
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
