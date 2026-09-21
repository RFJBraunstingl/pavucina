import type { Metadata } from "next";

import TimelineView from "@/app/_components/timeline/timeline-view";

export const metadata: Metadata = {
  title: "Timeline · Pavucina",
};

export default function Page() {
  return <TimelineView />;
}
