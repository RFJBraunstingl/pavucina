import type { Metadata } from "next";
import Providers from "@/app/_components/providers";
import "@/app/globals.css";
import "@/app/_styles/common/base.css";
import "@/app/_styles/common/controls.css";
import "@/app/_styles/common/dialog.css";
import "@/app/_styles/timeline/timeline-grid.css";
import "@/app/_styles/timeline/timeline-resize.css";
import "@/app/_styles/timeline/timeline-filters.css";
import "@/app/_styles/timeline/task-bars.css";
import "@/app/_styles/timeline/inspector.css";
import "@/app/_styles/calendar/calendar.css";
import "@/app/_styles/calendar/calendar-creation.css";
import "@/app/_styles/calendar/external-calendar.css";
import "@/app/_styles/calendar/schedule.css";
import "@/app/_styles/todo/todo.css";
import "@/app/_styles/todo/todo-dialog.css";
import "@/app/_styles/preferences/preferences.css";
import "@/app/_styles/inbox/inbox.css";
import "@/app/_styles/inbox/mailbox.css";
import "@/app/_styles/inbox/mailbox-picker.css";
import "@/app/_styles/inbox/scratchpad.css";
import "@/app/_styles/preferences/legal.css";
import "@/app/_styles/common/responsive.css";

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
