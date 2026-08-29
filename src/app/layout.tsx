import type { Metadata } from "next";
import "./globals.css";
import "./_styles/base.css";
import "./_styles/controls.css";
import "./_styles/timeline-grid.css";
import "./_styles/task-bars.css";
import "./_styles/inspector.css";
import "./_styles/calendar.css";
import "./_styles/responsive.css";

export const metadata: Metadata = {
  title: "Timeline · Pavucina",
  description: "Plan hierarchical tasks on a timeline.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
