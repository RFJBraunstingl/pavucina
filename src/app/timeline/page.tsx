import type { Metadata } from "next";

import TimelineView from "../_components/timeline-view";

export const metadata: Metadata = {
  title: "Timeline · Pavucina",
};

export default function Page() {
  return <TimelineView />;
}
